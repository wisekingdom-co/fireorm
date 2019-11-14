import { getMetadataStorage, CollectionMetadataArgs } from "../metadata-storage"
import { plural } from 'pluralize'

function getCollectionPath(entityName: string) {
    return plural(entityName
        .replace(/[\w]([A-Z])/g, m => {
            return m[0] + "_" + m[1]
        })
        .toLowerCase()
        .replace("_entity",'')
        .replace('_model', '')
    )
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
            prefix: options.prefix
        } as CollectionMetadataArgs)
    }
}