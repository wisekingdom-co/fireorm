import { Firestore, WriteResult, CollectionReference } from '@google-cloud/firestore'
import { getMetadataStorage } from '../metadata-storage';
import { DeepPartial } from '../common/deep-partial';
import { EntitySchema } from '../common/entity-schema';
import { TransactionRepository } from './transaction-repository';
import { QueryDeepPartialEntity, QueryDotNotationPartialEntity } from '../query-builder/query-partial-entity';
import { FindOneOptions, FindManyOptions } from '../query-builder/find-options';
import { FindConditions } from '../query-builder/find-conditions';
import { CollectionGroupRepository } from './collection-group-repository';

const { FieldTransform } = require('@google-cloud/firestore/build/src/field-value')
const isClass = require('is-class')

export class CollectionRepository<Entity = any> extends CollectionGroupRepository<Entity> {
    static getCollectionRepository<Entity>(target: EntitySchema<Entity>, firestore: Firestore,): CollectionRepository<Entity> {
        return new CollectionRepository<Entity>(target, firestore)
    }

    protected idPropName: string
    protected collectionName: string
    protected collectionRef: CollectionReference

    constructor(protected target: EntitySchema<Entity>, protected firestore: Firestore) {
        super(target, firestore.collection(getMetadataStorage().getCollectionName(target)));
        
        this.idPropName = getMetadataStorage().getIdPropName(this.target)
        this.collectionName = getMetadataStorage().getCollectionName(this.target)
        this.collectionRef = this.firestore.collection(this.collectionName)
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

    protected getId(): string {
        const id = getMetadataStorage().getIdGenerataValue(this.target)
        if (id) {
            return id
        }
        const collectionName = getMetadataStorage().getCollectionName(this.target)
        return this.firestore.collection(collectionName).doc().id
    }

    async runTransaction<T>(updateFunction: (tnxRepo: TransactionRepository) => Promise<T>, transactionOptions?: {maxAttempts?: number}): Promise<T> {
        return this.firestore.runTransaction(tnx => updateFunction(new TransactionRepository(this.firestore, tnx)), transactionOptions)
    }

    async findById(id: string, options?: FindOneOptions<Entity>): Promise<Entity | undefined> {
        const collectionName = getMetadataStorage().getCollectionName(this.target)
        const collectionRef = this.firestore.collection(collectionName)

        const docRef = await collectionRef.doc(id).get()
        return docRef.exists ? this.transformToClass(docRef.data()) : undefined
    }

    async findByIds(ids: string[], options?: FindOneOptions<Entity>): Promise<Entity[]> {
        const collectionName = getMetadataStorage().getCollectionName(this.target)
        const collectionRef = this.firestore.collection(collectionName)

        const docRefs = await this.firestore.getAll(...ids.map(id => collectionRef.doc(id)))
        return docRefs.map(docRef => this.transformToClass(docRef.data()))
    }

    async save<T extends DeepPartial<Entity>>(entity: T): Promise<T>;
    async save<T extends DeepPartial<Entity>>(entities: T[]): Promise<T[]>;
    async save<T extends DeepPartial<Entity>>(entityOrEntities: T|T[]): Promise<T|T[]> {
        if (entityOrEntities instanceof Array) {
            const batch = this.firestore.batch()
            const docs = entityOrEntities.map(entity => {
                let entityClassObject = entity as any
                if (!isClass(entity))
                    entityClassObject = this.transformToClass(entity)

                const id = entityClassObject[this.idPropName]
                if (id) {
                    delete entityClassObject[this.idPropName]

                    batch.update(this.collectionRef.doc(id), this.transformToPlain(entityClassObject))
                    return entityClassObject
                } else {
                    entityClassObject[this.idPropName] = this.getId()
                    
                    batch.create(this.collectionRef
                        .doc(entityClassObject[this.idPropName]), this.transformToPlain(entityClassObject))
                    return entityClassObject
                }
            })
            await batch.commit()
            return docs;
        } else {
            let entityClassObject = entityOrEntities as any
            if (!isClass(entityOrEntities))
                entityClassObject = this.transformToClass(entityClassObject)

            const id = entityClassObject[this.idPropName]
            if (id) {
                entityClassObject[this.idPropName]

                await this.collectionRef.doc(id).update(this.transformToPlain(entityClassObject))
                return entityClassObject
            } else {
                entityClassObject[this.idPropName] = this.getId()

                await this.collectionRef
                    .doc(entityClassObject[this.idPropName])
                    .set(this.transformToPlain(entityClassObject))
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
                if (!isClass(entity))
                    entityClassObject = this.transformToClass(entity)
                
                entityClassObject[this.idPropName] = this.getId()

                batch.create(this.collectionRef.doc(entityClassObject[this.idPropName]), this.transformToPlain(entityClassObject))
                return entityClassObject
            })

            batch.commit()
            return docs
        } else {
            let entityClassObject = partialEntity as any
            if (!isClass(entityClassObject))
                entityClassObject = this.transformToClass(partialEntity)
            
            entityClassObject[this.idPropName] = this.getId()

            this.collectionRef
                .doc(entityClassObject[this.idPropName])
                .set(this.transformToPlain(entityClassObject))
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
            const docs = await this.find(criteria)
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
            const docs = await this.find(criteria)
            const batch = this.firestore.batch()
            docs.forEach(doc => {
                const docRef = this.collectionRef.doc((doc as any)[this.idPropName])
                batch.delete(docRef)
            })
            return batch.commit()
        }
    }
}