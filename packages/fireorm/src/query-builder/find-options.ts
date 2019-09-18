import { FindConditions } from "./find-conditions";
import { ObjectLiteral } from "../common/object-literal";

export interface FindOneOptions<Entity = any> {
    select?: (keyof Entity)[];
    where?: FindConditions<Entity>[] | FindConditions<Entity> | ObjectLiteral
    relations?: string[]
    order?: { [P in keyof Entity]?: "asc" | "desc" };
    cache?: number | boolean

    startAfter?: any[]
    startAt?: any[]
    endBefore?: any[]
    endAt?: any[]
}

export interface FindManyOptions<Entity = any> extends FindOneOptions<Entity> {
    limit?: number
    offset?: number
}