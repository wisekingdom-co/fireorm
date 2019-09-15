import { Firestore, Query, Timestamp, GeoPoint, DocumentReference, FieldValue, DocumentSnapshot, Transaction, QuerySnapshot } from "@google-cloud/firestore";
import { FindOptionsUtils } from "../query-builder/find-options-utils";
import { getMetadataStorage } from "../metadata-storage";
import { EntitySchema } from "../common/entity-schema";
import { plainToClass, classToPlain } from "class-transformer";
import { FindConditions } from "../query-builder/find-conditions";
import { FindManyOptions, FindOneOptions } from "../query-builder";
import * as dot from 'dot-object'

export class CollectionQuery {
    constructor(protected firestore: Firestore, protected parentPath?: string, protected tnx?: Transaction) {}

    protected getFindConditionsFromFindManyOptions<Entity>(optionsOrConditions: string | FindManyOptions<Entity> | FindConditions<Entity> | undefined): FindConditions<Entity> | undefined {
        if (!optionsOrConditions)
            return undefined;

        if (FindOptionsUtils.isFindManyOptions(optionsOrConditions))
            return optionsOrConditions.where as FindConditions<Entity> 

        return optionsOrConditions as FindConditions<Entity>
    }

    protected getFindConditionsFromFindOneOptions<Entity>(optionsOrConditions: string | FindOneOptions<Entity> | FindConditions<Entity> | undefined): FindConditions<Entity> | undefined {
        if (!optionsOrConditions)
            return undefined;

        if (FindOptionsUtils.isFindOneOptions(optionsOrConditions))
            return optionsOrConditions.where as FindConditions<Entity> 

        return optionsOrConditions as FindConditions<Entity> 
    }

    transformToClass<Entity>(target: EntitySchema<Entity>, obj: any): Entity {
        return plainToClass(target, this.convertToJsObject(obj));
    }

    transformToPlain<Entity>(obj: Entity) {
        return this.convertToFirestoreObject(classToPlain(obj))
    }

    protected convertToJsObject(obj: any) {
        Object.keys(obj).forEach(key => {
            if (!obj[key]) 
                return;
            if (obj[key] instanceof DocumentReference) {
                obj[key] = obj[key].id
            } else if (typeof obj[key] === 'object' && 'toDate' in obj[key]) {
                obj[key] = obj[key].toDate();
            } else if (obj[key].constructor.name === 'GeoPoint') {
                const { latitude, longitude } = obj[key];
                obj[key] = { latitude, longitude };
            } else if (typeof obj[key] === 'object') {
                this.convertToJsObject(obj[key]);
            }
        });
        return obj
    }

    protected convertToFirestoreObject(obj: any) {
        Object.keys(obj).forEach(key => {
            if (obj[key] === undefined)  {
                delete obj[key]
            }

            if (obj[key] && obj[key].$ref) {
                const { id, path } = obj[key].$ref
                obj[key] = this.firestore.collection(path).doc(id)
            } else if (obj[key] instanceof Array) {
                obj[key].forEach((_: any, index: number) => {
                    if (obj[key][index] === undefined) {
                        obj[key][index] = null
                    } else if (typeof obj[key][index] === 'object' 
                        && !(obj[key][index] instanceof Date) 
                        && !(obj[key][index] instanceof Timestamp) 
                        && !(obj[key][index] instanceof GeoPoint)) {
                        this.convertToFirestoreObject(obj[key][index])
                    }
                })
                
            } else if (typeof obj[key] === 'object') {
                this.convertToFirestoreObject(obj[key])
            }
        })
        return obj
    }

    protected async loadRelations<Entity>(target: EntitySchema<Entity>, docs: DocumentSnapshot[], relations?: string[]) {
        const relationDocMapping = [] as any[]
        const relationDocCache: { [path: string]: Promise<DocumentSnapshot> | Promise<QuerySnapshot> } = {}

        const idPropName = getMetadataStorage().getIdPropName(target)
        const collectionPath = getMetadataStorage().getCollectionPath(target)

        const datas = docs.map((doc, index) => {
            const data = { ...doc.data() } as any

            if (relations && relations.length > 0) {
                const relationMetadataArgs = getMetadataStorage().relations.filter(item => item.target === target)
                
                relations.forEach(relation => {
                    const relationMetadataArg = relationMetadataArgs.find(item => item.propertyName === relation)
                    if (relationMetadataArg && relationMetadataArg.relationType === 'many-to-one') {
                        if(!relationDocMapping[index])
                            relationDocMapping.push({})

                        const field = dot.pick(relation, data)
                        if (field instanceof DocumentReference) {
                            relationDocMapping[index][relation] = field.path

                            if (!relationDocCache[field.path])
                                relationDocCache[field.path] = field.get()
                        }

                    } else if (relationMetadataArg && relationMetadataArg.relationType === 'one-to-many') {
                        const relationCollectionPath = getMetadataStorage().getCollectionPath(relationMetadataArg.type())
                        const documentPath = collectionPath + '/' + data[idPropName]

                        if(!relationDocMapping[index])
                            relationDocMapping.push({})

                        relationDocMapping[index][relation] = documentPath

                        if (!relationDocCache[documentPath])
                            relationDocCache[documentPath] = this.firestore
                                .collection(relationCollectionPath)
                                .where(relationMetadataArg.inverseSide!, '==', this.firestore.doc(documentPath))
                                .get()
                    }
                })
            }
            return data
        })
    
        if (relationDocMapping.length) {
            const relationCachePromise = Object.keys(relationDocCache).map(async key => {
                return { key, value: await relationDocCache[key] }
            })
            const relationCachePromiseResult = await Promise.all(relationCachePromise)
            const relationCacheData = relationCachePromiseResult.reduce((object, current) => {
                if (current.value instanceof DocumentSnapshot) {
                    object[current.key] = { ...current.value.data() }
                }
                if (current.value instanceof QuerySnapshot) {
                    object[current.key] = current.value.docs.map(doc => {
                        return { ...doc.data() }
                    })
                }
                return object
            }, {} as any)

            const relationDocDotMapping = dot.dot(relationDocMapping)
            Object.keys(relationDocDotMapping).forEach(key => {
                if (relationCacheData[relationDocDotMapping[key]]) {
                    dot.set(key, relationCacheData[relationDocDotMapping[key]], datas)
                }
            })
        }
        return datas.map(data => {
            return this.transformToClass<Entity>(target, data)
        })
    }

    protected getCollectionnPath<Entity>(target: EntitySchema<Entity>) {
        return this.parentPath ? this.parentPath : getMetadataStorage().getCollectionPath(target)
    }

    async find<Entity>(target: EntitySchema<Entity>, options?: FindManyOptions<Entity>): Promise<Entity[]>
    async find<Entity>(target: EntitySchema<Entity>, conditions?: FindConditions<Entity>): Promise<Entity[]>
    async find<Entity>(target: EntitySchema<Entity>, optionsOrConditions?: FindManyOptions<Entity> | FindConditions<Entity>): Promise<Entity[]> {
        const collectionPath = this.getCollectionnPath(target)
        let selfQuery = this.firestore.collection(collectionPath) as Query

        const where = this.getFindConditionsFromFindManyOptions(optionsOrConditions);
        if (where) {
            const relationMetadatas = getMetadataStorage().relations.filter(item => item.target === target)

            Object.keys(where).forEach((fieldPath) => {
                const relationMetadata = relationMetadatas.find(item => item.propertyName === fieldPath)
                if (relationMetadata && !((where as any)[fieldPath] instanceof DocumentReference)) {
                    const relationCollectionPath = getMetadataStorage().getCollectionPath(relationMetadata.type)
                    const relationDocumentPath = relationCollectionPath + '/' + (where as any)[fieldPath]

                    selfQuery = selfQuery.where(fieldPath, '==', this.firestore.doc(relationDocumentPath))
                } else if ((where as any)[fieldPath].type) {
                    selfQuery = selfQuery.where(fieldPath, (where as any)[fieldPath].type, (where as any)[fieldPath].value)
                } else {
                    selfQuery = selfQuery.where(fieldPath, "==", (where as any)[fieldPath])
                }
            })
        }

        let relations: string[] = []
        if (FindOptionsUtils.isFindManyOptions(optionsOrConditions)) {
            if (optionsOrConditions.select)
                selfQuery = selfQuery.select(...optionsOrConditions.select as any)
            
            if (optionsOrConditions.order)
                Object.keys(optionsOrConditions.order).forEach((fieldPath) => {
                    selfQuery = selfQuery.orderBy(fieldPath, (optionsOrConditions.order as any)[fieldPath])
                })
            
            if (optionsOrConditions.limit)
                selfQuery = selfQuery.limit(optionsOrConditions.limit);
            
            if (optionsOrConditions.offset) 
                selfQuery = selfQuery.limit(optionsOrConditions.offset);

            if (optionsOrConditions.relations) 
                relations = optionsOrConditions.relations
        }

        const querySnapshot = await (this.tnx ? this.tnx.get(selfQuery) : selfQuery.get())
        return this.loadRelations(target, querySnapshot.docs, relations)
    }

    async findOne<Entity>(target: EntitySchema<Entity>, options?: FindOneOptions<Entity>): Promise<Entity | undefined>
    async findOne<Entity>(target: EntitySchema<Entity>, conditions?: FindConditions<Entity>): Promise<Entity | undefined>
    async findOne<Entity>(target: EntitySchema<Entity>, optionsOrConditions?: FindOneOptions<Entity> | FindConditions<Entity>): Promise<Entity | undefined> {
        const collectionPath = this.getCollectionnPath(target)
        let selfQuery: Query = this.firestore.collection(collectionPath)

        const where = this.getFindConditionsFromFindOneOptions(optionsOrConditions);
        if (where) {
            const relationMetadatas = getMetadataStorage().relations.filter(item => item.target === target)

            Object.keys(where).forEach((fieldPath) => {
                const relationMetadata = relationMetadatas.find(item => item.propertyName === fieldPath)
                if (relationMetadata) {
                    const relationCollectionPath = getMetadataStorage().getCollectionPath(relationMetadata.type())
                    const relationDocumentPath = relationCollectionPath + '/' + (where as any)[fieldPath]

                    selfQuery = selfQuery.where(fieldPath, '==', this.firestore.doc(relationDocumentPath))
                } else if ((where as any)[fieldPath].type) {
                    selfQuery = selfQuery.where(fieldPath, (where as any)[fieldPath].type, (where as any)[fieldPath].value)
                } else {
                    selfQuery = selfQuery.where(fieldPath, "==", (where as any)[fieldPath])
                }
            })
        }

        let relations: string[] = []
        if (FindOptionsUtils.isFindOneOptions(optionsOrConditions)) {
            if (optionsOrConditions.select)
                selfQuery = selfQuery.select(...optionsOrConditions.select as any)
            
            if (optionsOrConditions.relations)
                relations = optionsOrConditions.relations

            if (optionsOrConditions.order)
                Object.keys(optionsOrConditions.order).forEach((fieldPath) => {
                    selfQuery = selfQuery.orderBy(fieldPath, (optionsOrConditions.order as any)[fieldPath])
                })
        }

        const querySnapshot = await (this.tnx ? this.tnx.get(selfQuery.limit(1)) : selfQuery.limit(1).get())
        if (querySnapshot.docs.length === 0 || !querySnapshot.docs[0].exists)
            return undefined

        const entities = await this.loadRelations(target, querySnapshot.docs, relations)
        return entities[0]
    }

    async findOneOrFail<Entity>(target: EntitySchema<Entity>, options?: FindOneOptions<Entity>): Promise<Entity>
    async findOneOrFail<Entity>(target: EntitySchema<Entity>, conditions?: FindConditions<Entity>): Promise<Entity>
    async findOneOrFail<Entity>(target: EntitySchema<Entity>, optionsOrConditions?: FindOneOptions<Entity> | FindConditions<Entity>): Promise<Entity> {
        return this.findOne<Entity>(target, optionsOrConditions).then(value => {
            if (value === undefined) {
                return Promise.reject(new Error('EntityNotFoundError'))
            }
            return Promise.resolve(value)
        })
    }

    async findByIds<Entity>(target: EntitySchema<Entity>, id: string, options?: FindOneOptions<Entity>): Promise<Entity | undefined>
    async findByIds<Entity>(target: EntitySchema<Entity>, ids: string[], options?: FindOneOptions<Entity>): Promise<(Entity | undefined)[]>
    async findByIds<Entity>(target: EntitySchema<Entity>, idOrIds: string | string[], options?: FindOneOptions<Entity>): Promise<(Entity | undefined) | (Entity | undefined)[]> {
        const collectionPath = this.getCollectionnPath(target)
        const collectionRef = this.firestore.collection(collectionPath)
        const ids = idOrIds instanceof Array ? idOrIds : [idOrIds]

        const docRefs = ids.map(id => collectionRef.doc(id))
        const docSnapshots = await (this.tnx ? this.tnx.getAll(...docRefs) : this.firestore.getAll(...docRefs))

        if (idOrIds instanceof Array) {
            return this.loadRelations(target, docSnapshots, options && options.relations ? options.relations : [])
        } else {
            if (docSnapshots.length === 0 || !docSnapshots[0].exists)
                return undefined

            const entities = await this.loadRelations(target, docSnapshots, options && options.relations ? options.relations : [])
            return entities[0]
        }
    }
}
