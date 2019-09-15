import { CollectionOptions } from "./decorators/collection.decorator";
import { IdPropertyOptions } from "./decorators/id-prop.decorator";
import { PropertyOptions } from "./decorators/prop.decorator";
import { ObjectType } from "./common";

export interface CollectionMetadataArgs {
    path: string
    target: Function
    options: CollectionOptions
}

export interface IdPropertyMetadataArgs {
    target: Function
    propertyName: string
    strategy: "uuid/v1" | 'uuid/v4' | 'auto' | (() => string)
    options: IdPropertyOptions
}

export interface PropertyMetadataArgs {
    target: Function
    propertyName: string
    type: any
    options: PropertyOptions
}

export interface RelationMetadataArgs {
    target: Function
    propertyName: string
    type: () => ObjectType<any>
    relationType: "one-to-many" | "many-to-one"
    inverseSide?: string
}


export class MetadataStorage {
    readonly collections: CollectionMetadataArgs[] = []

    readonly ids: IdPropertyMetadataArgs[]  = []
    readonly properties: PropertyMetadataArgs[] = []
    readonly relations: RelationMetadataArgs[] = []

    getCollection (target: Function) {
        const collection = this.collections.find(collection => collection.target === target)
        if (!collection) {
            throw new Error("CollectionNotFound")
        }
        return collection
    }

    getCollectionPath (target: Function) {
        const collection = this.collections.find(collection => collection.target === target)
        if (!collection) {
            console.error('getCollectionPath', target)
            throw new Error("CollectionNotFound" + target)
        }
        return (collection.options.prefix ? collection.options.prefix : '') + collection.path
    }

    getProperties(target: Function) {
        return this.properties.filter(property => property.target === target)
    }

    getIdProp(target: Function) {
        const primaryProp = this.ids.find(idProp => idProp.target === target)
        if (!primaryProp) {
            throw new Error("IdPerpertyNotFound")
        }
        return primaryProp
    }

    getIdPropName(target: Function) {
        const primaryProp = this.getIdProp(target)
        return primaryProp.propertyName
    }

    getIdGenerataValue(target: Function) {
        const primaryProp = this.getIdProp(target)
        if (typeof primaryProp.strategy === 'function') {
            return primaryProp.strategy()
        }
        if (primaryProp.strategy === "uuid/v1") {
            return require('uuid/v1')()
        }
        if (primaryProp.strategy === "uuid/v4") {
            return require('uuid/v4')()
        }
        return undefined
    }
}


let store: MetadataStorage;

export const getMetadataStorage = (): MetadataStorage => {
    if (!store) {
        store = new MetadataStorage()
    }
  
    return store;
};
