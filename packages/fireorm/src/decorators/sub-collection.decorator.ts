import { getMetadataStorage, CollectionMetadataArgs } from "../metadata-storage"
import { plural } from 'pluralize';

function getSubCollectionPath(entityName: string) {
    return plural(entityName
        .replace(/[\w]([A-Z])/g, m => {
            return m[0] + "_" + m[1];
        })
        .toLowerCase()
        .replace("_entity",'')
        .replace('_model', '')
    )
}

export interface SubCollectionOptions { }

export function SubCollection(path?: string, options: SubCollectionOptions = {}): Function {
    return function(target: Function) {
        getMetadataStorage().collections.push({
            path: path || getSubCollectionPath((target as any).name),
            target,
            options,
        } as CollectionMetadataArgs)
    }
}