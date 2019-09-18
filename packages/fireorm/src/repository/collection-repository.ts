import { Firestore, WriteResult, CollectionReference } from '@google-cloud/firestore'
import { classToClass } from 'class-transformer'
import { getMetadataStorage } from '../metadata-storage';
import { DeepPartial } from '../common/deep-partial';
import { EntitySchema } from '../common/entity-schema';
import { TransactionRepository } from './transaction-repository';
import { QueryDeepPartialEntity, QueryDotNotationPartialEntity } from '../query-builder/query-partial-entity';
import { FindManyOptions, FindOneOptions } from '../query-builder/find-options';
import { FindConditions } from '../query-builder/find-conditions';
import { CollectionQuery } from './collection-query';

const { FieldTransform } = require('@google-cloud/firestore/build/src/field-value')

export class CollectionRepository<Entity = any> {
    static getRepository<Entity>(target: EntitySchema<Entity>, firestore: Firestore, parentPath?: string): CollectionRepository<Entity> {
        return new CollectionRepository<Entity>(target, firestore, new CollectionQuery(firestore, parentPath), parentPath)
    }

    protected idPropName: string
    protected collectionPath: string
    protected collectionRef: CollectionReference

    constructor(
        protected target: EntitySchema<Entity>, 
        protected firestore: Firestore, 
        protected query: CollectionQuery, 
        collectionPath?: string
    ) {
        this.idPropName = getMetadataStorage().getIdPropName(this.target)
        this.collectionPath = collectionPath ? collectionPath : getMetadataStorage().getCollectionPath(this.target)
        this.collectionRef = this.firestore.collection(this.collectionPath)
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

    getDocId(): string {
        const id = getMetadataStorage().getIdGenerataValue(this.target)
        if (id) {
            return id
        }
        const collectionPath = getMetadataStorage().getCollectionPath(this.target)
        return this.firestore.collection(collectionPath).doc().id
    }

    getDocRef(docId?: string) {
        return this.collectionRef.doc(docId || this.getDocId())
    }

    runTransaction<T>(updateFunction: (tnxRepo: TransactionRepository) => Promise<T>, transactionOptions?: {maxAttempts?: number}): Promise<T> {
        return this.firestore.runTransaction(tnx => updateFunction(new TransactionRepository(this.firestore, this.collectionPath, tnx)), transactionOptions)
    }

    getSubRepository<T>(target: EntitySchema<T>, field: keyof Entity, id: string) {
        const subCollectionPath = `${this.collectionPath}/${id}/${field}`
        return CollectionRepository.getRepository(target, this.firestore, subCollectionPath)
    }

    async save<T extends DeepPartial<Entity>>(entity: T): Promise<T>;
    async save<T extends DeepPartial<Entity>>(entities: T[]): Promise<T[]>;
    async save<T extends DeepPartial<Entity>>(entityOrEntities: T|T[]): Promise<T|T[]> {
        if (entityOrEntities instanceof Array) {
            const batch = this.firestore.batch()
            const docs = entityOrEntities.map(entity => {
                let entityClassObject = entity as any
                if (!(entity instanceof this.target)) {
                    entityClassObject = this.query.transformToClass(this.target, entity)
                } else {
                    entityClassObject = classToClass(entity)
                }

                const id = entityClassObject[this.idPropName]
                if (id) {
                    delete entityClassObject[this.idPropName]

                    batch.update(this.collectionRef.doc(id), this.query.transformToPlain(entityClassObject))
                    return entityClassObject
                } else {
                    entityClassObject[this.idPropName] = this.getDocId()
                    
                    batch.create(this.collectionRef
                        .doc(entityClassObject[this.idPropName]), this.query.transformToPlain(entityClassObject))
                    return entityClassObject
                }
            })
            await batch.commit()
            return docs;
        } else {
            let entityClassObject = entityOrEntities as any
            if (!(entityOrEntities instanceof this.target)) {
                entityClassObject = this.query.transformToClass(this.target, entityOrEntities)
            } else {
                entityClassObject = classToClass(entityClassObject)
            }

            const id = entityClassObject[this.idPropName]
            if (id) {
                entityClassObject[this.idPropName]

                await this.collectionRef.doc(id).update(this.query.transformToPlain(entityClassObject))
                return entityClassObject
            } else {
                entityClassObject[this.idPropName] = this.getDocId()

                await this.collectionRef
                    .doc(entityClassObject[this.idPropName])
                    .set(this.query.transformToPlain(entityClassObject))
                return entityClassObject
            }
        }
    }

    async create(partialEntity: QueryDeepPartialEntity<Entity>): Promise<Entity>
    async create(partialEntity: QueryDeepPartialEntity<Entity>[]): Promise<Entity[]>
    async create(partialEntity: QueryDeepPartialEntity<Entity> | QueryDeepPartialEntity<Entity>[]): Promise<Entity[] | Entity> {
        if (partialEntity instanceof Array) {
            const batch = this.firestore.batch()
            const docs = partialEntity.map(entity => {
                let entityClassObject = entity as any
                if (!(entity instanceof this.target))
                    entityClassObject = this.query.transformToClass(this.target, entity)
                
                entityClassObject[this.idPropName] = this.getDocId()

                batch.create(
                    this.collectionRef.doc(entityClassObject[this.idPropName]), 
                    this.query.transformToPlain(entityClassObject)
                )
                return entityClassObject
            })

            batch.commit()
            return docs
        } else {
            let entityClassObject = partialEntity as any
            if (!(partialEntity instanceof this.target))
                entityClassObject = this.query.transformToClass(this.target, partialEntity)
            
            entityClassObject[this.idPropName] = this.getDocId()

            this.collectionRef
                .doc(entityClassObject[this.idPropName])
                .set(this.query.transformToPlain(entityClassObject))
            return entityClassObject
        }
    }

    async update(criteria: string, partialEntity: QueryDeepPartialEntity<Entity> | QueryDotNotationPartialEntity): Promise<WriteResult>
    async update(criteria: string[], partialEntity: QueryDeepPartialEntity<Entity> | QueryDotNotationPartialEntity): Promise<WriteResult[]>
    async update(criteria: FindManyOptions<Entity>, partialEntity: QueryDeepPartialEntity<Entity> | QueryDotNotationPartialEntity): Promise<WriteResult[]>
    async update(criteria: FindConditions<Entity>, partialEntity: QueryDeepPartialEntity<Entity> | QueryDotNotationPartialEntity): Promise<WriteResult[]>
    async update(criteria: string | string[] | FindManyOptions<Entity> | FindConditions<Entity>, partialEntity: QueryDeepPartialEntity<Entity> | QueryDotNotationPartialEntity): Promise<WriteResult | WriteResult[]> {
        if (criteria instanceof Array) {
            const batch = this.firestore.batch()
            criteria.forEach(id => {
                delete (partialEntity as any)[this.idPropName]
                batch.update(this.collectionRef.doc(id), this.dotNotationObj(partialEntity))
            })
            return batch.commit()
        } else if (typeof criteria === 'string') {
            delete (partialEntity as any)[this.idPropName]
            return this.collectionRef.doc(criteria).update(this.dotNotationObj(partialEntity))
        } else {
            const docs = await this.query.find(this.target, criteria)
            const batch = this.firestore.batch()
            docs.forEach(doc => {
                const docRef = this.collectionRef.doc((doc as any)[this.idPropName])
                batch.delete(docRef)
            })
            return batch.commit()
        }
    }

    async delete(criteria: string): Promise<WriteResult>
    async delete(criteria: string[]): Promise<WriteResult[]>
    async delete(criteria: FindManyOptions<Entity>): Promise<WriteResult[]>
    async delete(criteria: FindConditions<Entity>): Promise<WriteResult[]>
    async delete(criteria: string | string[] | FindManyOptions<Entity> | FindConditions<Entity>): Promise<WriteResult | WriteResult[]> {
        if (criteria instanceof Array) {
            const batch = this.firestore.batch()
            criteria.forEach(id => {
                const docRef = this.collectionRef.doc(id)
                batch.delete(docRef)
            })
            return batch.commit()
        } else if (typeof criteria === 'string') {
            return this.collectionRef.doc(criteria).delete()
        } else {
            const docs = await this.query.find(this.target, criteria)
            const batch = this.firestore.batch()
            docs.forEach(doc => {
                const docRef = this.collectionRef.doc((doc as any)[this.idPropName])
                batch.delete(docRef)
            })
            return batch.commit()
        }
    }

    async find(options?: FindManyOptions<Entity>): Promise<Entity[]>
    async find(conditions?: FindConditions<Entity>): Promise<Entity[]>
    async find(optionsOrConditions?: FindManyOptions<Entity> | FindConditions<Entity>): Promise<Entity[]> {
        return this.query.find(this.target, optionsOrConditions)
    }

    async findOne(options?: FindOneOptions<Entity>): Promise<Entity | undefined>
    async findOne(conditions?: FindConditions<Entity>): Promise<Entity | undefined>
    async findOne(optionsOrConditions?: FindOneOptions<Entity> | FindConditions<Entity>): Promise<Entity | undefined> {
        return this.query.findOne(this.target, optionsOrConditions)
    }

    async findOneOrFail(options?: FindOneOptions<Entity>): Promise<Entity>
    async findOneOrFail(conditions?: FindConditions<Entity>): Promise<Entity>
    async findOneOrFail(optionsOrConditions?: FindOneOptions<Entity> | FindConditions<Entity>): Promise<Entity> {
        return this.query.findOneOrFail(this.target, optionsOrConditions)
    }

    async findByIds(id: string, options?: FindOneOptions<Entity>): Promise<Entity | undefined>
    async findByIds(ids: string[], options?: FindOneOptions<Entity>): Promise<(Entity | undefined)[]>
    async findByIds(idOrIds: string | string[], options?: FindOneOptions<Entity>): Promise<(Entity | undefined) | (Entity | undefined)[]> {
        return this.query.findByIds(this.target, idOrIds as any, options)
    }
}