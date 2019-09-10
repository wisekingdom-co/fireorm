import { getMetadataStorage, CollectionMetadataArgs } from "../metadata-storage"
import { plural } from 'pluralize';

export interface CollectionOptions {
    prefix?: string
}

export function Collection(name?: string, options: CollectionOptions = {}): Function {
    return function(target: Function) {
        getMetadataStorage().collections.push({
            name: name ? name : plural(String((target as any).name).toLowerCase()),
            target,
            options,
        } as CollectionMetadataArgs)
    }
}