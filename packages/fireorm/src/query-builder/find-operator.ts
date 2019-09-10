
export type FindOperatorType = '<' | '<=' | '==' | '>=' | '>' | 'array-contains'
export type ArrayElement<A> = A extends readonly (infer T)[] ? T : string

export class FindOperator<T> {
    constructor(protected type: FindOperatorType, protected value: T) {}
}

export function Equal<T>(value: T) {
    return new FindOperator("==", value);
}

export function LessThan<T>(value: T) {
    return new FindOperator("<", value);
}

export function LessThanOrEqual<T>(value: T) {
    return new FindOperator("<=", value);
}

export function MoreThan<T>(value: T) {
    return new FindOperator(">", value);
}

export function MoreThanOrEqual<T>(value: T) {
    return new FindOperator(">=", value);
}

export function ArraContains<T>(value: ArrayElement<T>) {
    return new FindOperator("array-contains", value as any);
}