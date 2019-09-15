import { Firestore, Transaction } from "@google-cloud/firestore";
import { FindOptionsUtils } from "../query-builder/find-options-utils";
import { EntitySchema } from "../common/entity-schema";
import { getMetadataStorage } from "../metadata-storage";
import { QueryDeepPartialEntity, QueryDotNotationPartialEntity } from "../query-builder/query-partial-entity";
import { classToPlain, plainToClass } from "class-transformer";
import { FindConditions, FindManyOptions, FindOneOptions } from "../query-builder";
import { CollectionQuery } from "./collection-query";

const { FieldTransform } = require('@google-cloud/firestore/build/src/field-value')

export class TransactionRepository extends CollectionQuery {
    constructor(protected firestore: Firestore, protected parentPath: string, protected tnx: Transaction) {
        super(firestore, parentPath, tnx)
    }

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
        const collectionPath = getMetadataStorage().getCollectionPath(target)
        return this.firestore.collection(collectionPath).doc().id
    }

    async create<Entity>(target: EntitySchema<Entity>, partialEntity: QueryDeepPartialEntity<Entity> | QueryDeepPartialEntity<Entity>[]): Promise<Entity[] | Entity> {
        const idPropName = getMetadataStorage().getIdPropName(target)
        const collectionPath = getMetadataStorage().getCollectionPath(target)
        const collectionRef = this.firestore.collection(collectionPath)

        if (partialEntity instanceof Array) {
            const docs = partialEntity.map(entity => {
                let entityClassObject = entity as any
                if (!(entity instanceof target))
                    entityClassObject = plainToClass(target, entityClassObject)
                
                const newId = this.getId(target)
                const entityPlainObject: any = classToPlain(entityClassObject)
                entityPlainObject[idPropName] = newId

                this.tnx.create(collectionRef.doc(newId), entityPlainObject)
                return plainToClass(target, entityPlainObject)
            })
            return docs
        } else {
            let entityClassObject = partialEntity as any
            if (!(partialEntity instanceof target))
                entityClassObject = plainToClass(target, entityClassObject)
            
            const newId = this.getId(target)
            const entityPlainObject: any = classToPlain(entityClassObject)
            entityPlainObject[idPropName] = newId

            this.tnx.create(collectionRef.doc(newId), entityPlainObject)
            return plainToClass(target, entityPlainObject)
        }
    }

    async update<Entity>(target: EntitySchema<Entity>, criteria: string | string[], partialEntity: QueryDeepPartialEntity<Entity> | QueryDotNotationPartialEntity): Promise<void> {
        const idPropName = getMetadataStorage().getIdPropName(target)
        const collectionPath = getMetadataStorage().getCollectionPath(target)
        const collectionRef = this.firestore.collection(collectionPath)

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
        const collectionPath = getMetadataStorage().getCollectionPath(target)
        const collectionRef = this.firestore.collection(collectionPath)

        if (criteria instanceof Array) {
            criteria.forEach(id => {
                const docRef = collectionRef.doc(id)
                this.tnx.delete(docRef)
            })
        } else {
            this.tnx.delete(collectionRef.doc(criteria))
        }
    }
}