import { EntitySchema } from "../common"
import { Firestore } from "@google-cloud/firestore"
import { CollectionQuery } from "./collection-query"
import { FindManyOptions, FindConditions, FindOneOptions } from "../query-builder"

export class CollectionGroupRepository<Entity = any> {
    static getRepository<Entity>(target: EntitySchema<Entity>, firestore: Firestore, collectionId: string): CollectionGroupRepository<Entity> {
        const query = new CollectionQuery(firestore, { collectionId })
        return new CollectionGroupRepository<Entity>(target, firestore, query)
    }

    constructor(
        protected target: EntitySchema<Entity>, 
        protected firestore: Firestore, 
        protected query: CollectionQuery,
    ) {
    }

    async find(options?: FindManyOptions<Entity>): Promise<Entity[]>
    async find(conditions?: FindConditions<Entity>): Promise<Entity[]>
    async find(optionsOrConditions?: FindManyOptions<Entity> | FindConditions<Entity>): Promise<Entity[]> {
        return this.query.find(this.target, optionsOrConditions)
    }

    async findAndToken(options?: FindManyOptions<Entity>): Promise<[string | undefined, Entity[]]>
    async findAndToken(conditions?: FindConditions<Entity>): Promise<[string | undefined, Entity[]]>
    async findAndToken(optionsOrConditions?: FindManyOptions<Entity> | FindConditions<Entity>): Promise<[string | undefined, Entity[]]> {
        return this.query.findAndToken(this.target, optionsOrConditions)
    }

    async findByToken(token: string): Promise<[string | undefined, Entity[]]> {
        return this.query.findByToken(this.target, token)
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
}