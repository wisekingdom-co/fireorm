import { FindOperator } from "./find-operator";

export type FindConditions<T> = {
    [P in keyof T]?: FindConditions<T[P]> | FindOperator<FindConditions<T[P]>>
}