import { Firestore, Transaction, Query } from "@google-cloud/firestore";
import { FindOptionsUtils } from "../query-builder/find-options-utils";
import { EntitySchema } from "../common/entity-schema";
import { getMetadataStorage } from "../metadata-storage";
import { QueryDeepPartialEntity, QueryDotNotationPartialEntity } from "../query-builder/query-partial-entity";
import { classToPlain, plainToClass } from "class-transformer";
import { FindConditions, FindManyOptions, FindOneOptions } from "../query-builder";

const { FieldTransform } = require('@google-cloud/firestore/build/src/field-value')
const isClass = require('is-class')

export class TransactionRepository {
    constructor(protected firestore: Firestore, protected tnx: Transaction) { }

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

    protected isObject(x: any) {
        return Object(x) === x
    }

    protected dotNotationObj(data: any) {
        let loop = (namespace: any, acc: any, data: any) => {
            if (data instanceof FieldTransform || Array.isArray(data)) {
                Object.assign(acc, {[namespace.join('.')]: data})
            } else if (this.isObject(data)) {
                Object.keys(data).forEach(k=> {
                    loop(namespace.concat([k]), acc, data[k])
                })
            } else {
                Object.assign(acc, {[namespace.join('.')]: data})
            }
            return acc
        }
        return loop([], {}, data)
    }

    getId<Entity>(target: EntitySchema<Entity>): string {
        const id = getMetadataStorage().getIdGenerataValue(target)
        if (id) {
            id
        }
        const collectionName = getMetadataStorage().getCollectionName(target)
        return this.firestore.collection(collectionName).doc().id
    }

    async create<Entity>(target: EntitySchema<Entity>, partialEntity: QueryDeepPartialEntity<Entity> | QueryDeepPartialEntity<Entity>[]): Promise<Entity[] | Entity> {
        const idPropName = getMetadataStorage().getIdPropName(target)
        const collectionName = getMetadataStorage().getCollectionName(target)
        const collectionRef = this.firestore.collection(collectionName)

        if (partialEntity instanceof Array) {
            const docs = partialEntity.map(entity => {
                let entityClassObject = entity as any
                if (!isClass(entityClassObject)) {
                    entityClassObject = plainToClass(target, entityClassObject)
                }
                const newId = this.getId(target)

                const entityPlainObject: any = classToPlain(entityClassObject)
                entityPlainObject[idPropName] = newId

                this.tnx.create(collectionRef.doc(newId), entityPlainObject)
                return plainToClass(target, entityPlainObject)
            })
            return docs
        } else {
            let entityClassObject = partialEntity as any
            if (!isClass(entityClassObject)) {
                entityClassObject = plainToClass(target, entityClassObject)
            }
            const newId = this.getId(target)

            const entityPlainObject: any = classToPlain(entityClassObject)
            entityPlainObject[idPropName] = newId

            this.tnx.create(collectionRef.doc(newId), entityPlainObject)
            return plainToClass(target, entityPlainObject)
        }
    }

    async update<Entity>(target: EntitySchema<Entity>, criteria: string | string[], partialEntity: QueryDeepPartialEntity<Entity> | QueryDotNotationPartialEntity): Promise<void> {
        const idPropName = getMetadataStorage().getIdPropName(target)
        const collectionName = getMetadataStorage().getCollectionName(target)
        const collectionRef = this.firestore.collection(collectionName)

        if (criteria instanceof Array) {
            criteria.forEach(id => {
                delete (partialEntity as any)[idPropName]
                this.tnx.update(collectionRef.doc(id), this.dotNotationObj(partialEntity))
            })
        } else {
            delete (partialEntity as any)[idPropName]
            this.tnx.update(collectionRef.doc(criteria), this.dotNotationObj(partialEntity))
        }
    }

    async delete<Entity>(target: EntitySchema<Entity>, criteria: string | string[]): Promise<void> {
        const collectionName = getMetadataStorage().getCollectionName(target)
        const collectionRef = this.firestore.collection(collectionName)

        if (criteria instanceof Array) {
            criteria.forEach(id => {
                const docRef = collectionRef.doc(id)
                this.tnx.delete(docRef)
            })
        } else {
            this.tnx.delete(collectionRef.doc(criteria))
        }
    }

    async find<Entity>(target: EntitySchema<Entity>, optionsOrConditions?: FindManyOptions<Entity> | FindConditions<Entity>): Promise<Entity[]> {
        const collectionName = getMetadataStorage().getCollectionName(target)
        let query: Query = this.firestore.collection(collectionName)

        const where = this.getFindConditionsFromFindManyOptions(optionsOrConditions);
        if (where) {
            Object.keys(where).forEach((fieldPath) => {
                if ((where as any)[fieldPath].type) {
                    query = query.where(fieldPath, (where as any)[fieldPath].type, (where as any)[fieldPath].value)
                } else {
                    query = query.where(fieldPath, "==", (where as any)[fieldPath])
                }
            })
        }

        if (FindOptionsUtils.isFindManyOptions(optionsOrConditions)) {
            if (optionsOrConditions.select)
                query = query.select(...optionsOrConditions.select as any)
            
            if (optionsOrConditions.order)
                Object.keys(optionsOrConditions.order).forEach((fieldPath) => {
                    query = query.orderBy(fieldPath, (optionsOrConditions.order as any)[fieldPath])
                })
            
            if (optionsOrConditions.limit)
                query = query.limit(optionsOrConditions.limit);
            
            if (optionsOrConditions.offset) 
                query = query.limit(optionsOrConditions.offset);
        }

        const querySnapshot = await this.tnx.get(query)
        return querySnapshot.docs.map(doc => {
            return doc.data() as Entity
        })
    }

    async findOne<Entity>(target: EntitySchema<Entity>, optionsOrConditions?: FindOneOptions<Entity> | FindConditions<Entity>): Promise<Entity | undefined> {
        const collectionName = getMetadataStorage().getCollectionName(target)
        let query: Query = this.firestore.collection(collectionName)

        const where = this.getFindConditionsFromFindOneOptions(optionsOrConditions);
        if (where) {
            Object.keys(where).forEach((fieldPath) => {
                if ((where as any)[fieldPath].type) {
                    query = query.where(fieldPath, (where as any)[fieldPath].type, (where as any)[fieldPath].value)
                } else {
                    query = query.where(fieldPath, "==", (where as any)[fieldPath])
                }
            })
        }

        if (FindOptionsUtils.isFindOneOptions(optionsOrConditions)) {
            if (optionsOrConditions.select)
                query = query.select(...optionsOrConditions.select as any)
            
            if (optionsOrConditions.order)
                Object.keys(optionsOrConditions.order).forEach((fieldPath) => {
                    query = query.orderBy(fieldPath, (optionsOrConditions.order as any)[fieldPath])
                })
        }

        const querySnapshot = await this.tnx.get(query.limit(1))
        return querySnapshot.docs.length > 0 
            ? querySnapshot.docs[0].data() as Entity 
            : undefined
    }

    async findById<Entity>(target: EntitySchema<Entity>, id: string, options?: FindOneOptions<Entity>): Promise<Entity | undefined> {
        const collectionName = getMetadataStorage().getCollectionName(target)
        const collectionRef = this.firestore.collection(collectionName)

        const docRef = await this.tnx.get(collectionRef.doc(id))
        return docRef.exists ? docRef.data() as Entity : undefined
    }

    async findByIds<Entity>(target: EntitySchema<Entity>, ids: string[], options?: FindOneOptions<Entity>): Promise<Entity[]> {
        const collectionName = getMetadataStorage().getCollectionName(target)
        const collectionRef = this.firestore.collection(collectionName)

        const docRefs = ids.map(id => {
            return collectionRef.doc(id)
        })

        const docs = await this.tnx.getAll(...docRefs)
        return docs.map(doc => doc.data() as Entity)
    }
}