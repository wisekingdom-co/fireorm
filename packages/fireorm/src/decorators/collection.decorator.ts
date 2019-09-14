import { getMetadataStorage, CollectionMetadataArgs } from "../metadata-storage"
import { plural } from 'pluralize';

function getCollectionPath(entityName: string) {
    return plural(entityName)
        .replace(/[\w]([A-Z])/g, m => {
            return m[0] + "_" + m[1];
        })
        .toLowerCase()
        .replace("_entities",'')
        .replace('_models', '')
}

export interface CollectionOptions {
    prefix?: string
}

export function Collection(path?: string, options: CollectionOptions = {}): Function {
    return function(target: Function) {
        getMetadataStorage().collections.push({
            path: path || getCollectionPath((target as any).name),
            target,
            options,
        } as CollectionMetadataArgs)
    }
}