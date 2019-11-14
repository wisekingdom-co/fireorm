
export type FindOperatorType = '<' | '<=' | '==' | '>=' | '>' | 'array-contains' | 'array-contains-any' | 'in'
export type ArrayElement<A> = A extends readonly (infer T)[] ? T : string

export class FindOperator<T> {
    constructor(protected type: FindOperatorType, protected value: T) {}
}

export function Equal<T>(value: T) {
    return new FindOperator("==", value)
}

export function LessThan<T>(value: T) {
    return new FindOperator("<", value)
}

export function LessThanOrEqual<T>(value: T) {
    return new FindOperator("<=", value)
}

export function MoreThan<T>(value: T) {
    return new FindOperator(">", value)
}

export function MoreThanOrEqual<T>(value: T) {
    return new FindOperator(">=", value)
}

export function ArraContains<T>(value: ArrayElement<T>) {
    return new FindOperator("array-contains", value)
}

export function ArraContainsAny<T>(value: T[]) {
    return new FindOperator("array-contains-any", value)
}

export function In<T>(value: T[]) {
    return new FindOperator("in", value)
}