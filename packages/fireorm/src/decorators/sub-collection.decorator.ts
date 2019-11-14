import { getMetadataStorage, CollectionMetadataArgs } from "../metadata-storage"
import { plural } from 'pluralize'
import { EntitySchema } from "../common";

function getSubCollectionPath(entityName: string) {
    return plural(entityName
        .replace(/[\w]([A-Z])/g, m => {
            return m[0] + "_" + m[1]
        })
        .toLowerCase()
        .replace("_entity",'')
        .replace('_model', '')
    )
}

export interface SubCollectionOptions { }

export function SubCollection<Entity>(parentTarget: () => EntitySchema<Entity>, parentPath?: keyof Entity, options: SubCollectionOptions = {}): Function {
    return function(target: Function) {
        getMetadataStorage().collections.push({
            parent: parentTarget,
            path: parentPath || getSubCollectionPath((target as any).name),
            target,
            options,
        } as CollectionMetadataArgs)
    }
}