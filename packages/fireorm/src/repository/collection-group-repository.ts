import { Firestore, Query } from "@google-cloud/firestore";
import { FindOptionsUtils } from "../query-builder/find-options-utils";
import { getMetadataStorage } from "../metadata-storage";
import { EntitySchema } from "../common/entity-schema";
import { plainToClass, classToPlain } from "class-transformer";
import { FindConditions } from "../query-builder/find-conditions";
import { FindManyOptions, FindOneOptions } from "../query-builder";

export class CollectionGroupRepository<Entity = any> {
    static getCollectionGroupRepository<Entity>(firestore: Firestore, target: EntitySchema<Entity>): CollectionGroupRepository<Entity> {
        const collectionName = getMetadataStorage().getCollectionName(target)
        const query = firestore.collectionGroup(collectionName)

        return new CollectionGroupRepository<Entity>(target, query)
    }

    constructor(protected target: EntitySchema<Entity>, protected query: Query){}

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

    protected transformToClass = (obj: any): Entity => {
        Object.keys(obj).forEach(key => {
            if (!obj[key]) 
                return;

            if (typeof obj[key] === 'object' && 'toDate' in obj[key]) {
                obj[key] = obj[key].toDate();
            } else if (obj[key].constructor.name === 'GeoPoint') {
                const { latitude, longitude } = obj[key];
                obj[key] = { latitude, longitude };
            } else if (typeof obj[key] === 'object') {
                this.transformToClass(obj[key]);
            }
        });
        return plainToClass(this.target, obj);
    }

    protected transformToPlain = (obj: any) => {
        return JSON.parse(JSON.stringify(classToPlain(obj)))
    }

    async find(options?: FindManyOptions<Entity>): Promise<Entity[]>
    async find(conditions?: FindConditions<Entity>): Promise<Entity[]>
    async find(optionsOrConditions?: FindManyOptions<Entity> | FindConditions<Entity>): Promise<Entity[]> {
        let selfQuery = this.query

        const where = this.getFindConditionsFromFindManyOptions(optionsOrConditions);
        if (where) {
            Object.keys(where).forEach((fieldPath) => {
                if ((where as any)[fieldPath].type) {
                    selfQuery = selfQuery.where(fieldPath, (where as any)[fieldPath].type, (where as any)[fieldPath].value)
                } else {
                    selfQuery = selfQuery.where(fieldPath, "==", (where as any)[fieldPath])
                }
            })
        }

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
        }

        const querySnapshot = await selfQuery.get()
        return querySnapshot.docs.map(doc => {
            return this.transformToClass(doc.data())
        })
    }

    async findOne(options?: FindOneOptions<Entity>): Promise<Entity | undefined>
    async findOne(conditions?: FindConditions<Entity>): Promise<Entity | undefined>
    async findOne(optionsOrConditions?: FindOneOptions<Entity> | FindConditions<Entity>): Promise<Entity | undefined> {
        let selfQuery = this.query

        const where = this.getFindConditionsFromFindOneOptions(optionsOrConditions);
        if (where) {
            Object.keys(where).forEach((fieldPath) => {
                if ((where as any)[fieldPath].type) {
                    selfQuery = selfQuery.where(fieldPath, (where as any)[fieldPath].type, (where as any)[fieldPath].value)
                } else {
                    selfQuery = selfQuery.where(fieldPath, "==", (where as any)[fieldPath])
                }
            })
        }

        if (FindOptionsUtils.isFindOneOptions(optionsOrConditions)) {
            if (optionsOrConditions.select)
                selfQuery = selfQuery.select(...optionsOrConditions.select as any)
            
            if (optionsOrConditions.order)
                Object.keys(optionsOrConditions.order).forEach((fieldPath) => {
                    selfQuery = selfQuery.orderBy(fieldPath, (optionsOrConditions.order as any)[fieldPath])
                })
        }

        const querySnapshot = await selfQuery.limit(1).get()
        return querySnapshot.docs.length > 0 
            ? this.transformToClass(querySnapshot.docs[0].data()) as Entity 
            : undefined
    }

    async findOneOrFail(options?: FindOneOptions<Entity>): Promise<Entity>
    async findOneOrFail(conditions?: FindConditions<Entity>): Promise<Entity>
    async findOneOrFail(optionsOrConditions?: FindOneOptions<Entity> | FindConditions<Entity>): Promise<Entity> {
        return this.findOne(optionsOrConditions).then(value => {
            if (value === undefined) {
                return Promise.reject(new Error('EntityNotFoundError'))
            }
            return Promise.resolve(value)
        })
    }
}
