import { Firestore } from "@google-cloud/firestore"

export interface CollectionMetadataArgs {
    parentTarget?: Function
    path: string
    target: Function
    prefix?: string
}

export interface IdPropertyMetadataArgs {
    target: Function
    propertyName: string
    strategy?: "uuid/v1" | 'uuid/v4' | 'auto' | (() => string)
    generated: boolean
}

export interface PropertyMetadataArgs {
    target: Function
    propertyName: string
    type: any
    embedded: boolean
}

export interface RelationMetadataArgs {
    target: Function
    propertyName: string
    type: any
    relationType: "one-to-many" | "many-to-one"
    inverseSide?: string
}

export interface EmbeddedMetadataArgs {
    target: Function
    propertyName: string
    type: any
}

export class MetadataStorage {
    readonly collections: CollectionMetadataArgs[] = []

    readonly ids: IdPropertyMetadataArgs[]  = []
    readonly properties: PropertyMetadataArgs[] = []
    readonly embeddeds: EmbeddedMetadataArgs[] = []
    readonly relations: RelationMetadataArgs[] = []

    getCollection(target: Function) {
        const collection = this.collections.find(collection => collection.target === target)
        if (!collection) {
            throw new Error(`Collection not found, entity: ${target.name}`)
        }
        return collection
    }

    getCollectionPath(target: Function) {
        const collection = this.collections.find(collection => collection.target === target)
        if (!collection) {
            throw new Error(`Collection not found, entity: ${target.name}`)
        }
        return (collection.prefix ? collection.prefix : '') + collection.path
    }

    getProperties(target: Function) {
        return this.properties.filter(property => property.target === target)
    }

    getIdProp(target: Function) {
        const idProp = this.ids.find(idProp => idProp.target === target)
        if (!idProp) {
            throw new Error(`Id perperty not found, entity: ${target.name}`)
        }
        return idProp
    }

    getIdPropName(target: Function) {
        const primaryProp = this.getIdProp(target)
        return primaryProp.propertyName
    }

    getIdGenerataValue(target: Function, firestore: Firestore) {
        const primaryProp = this.getIdProp(target)
        if (primaryProp.generated) {
            if (typeof primaryProp.strategy === 'function') {
                return primaryProp.strategy()
            } else if (primaryProp.strategy === "uuid/v1") {
                return require('uuid/v1')()
            } else if (primaryProp.strategy === "uuid/v4") {
                return require('uuid/v4')()
            } else {
                const collectionPath = getMetadataStorage().getCollectionPath(target)
                return firestore.collection(collectionPath).doc().id
            }
        }
        return undefined
    }
}


let store: MetadataStorage

export const getMetadataStorage = (): MetadataStorage => {
    if (!store) {
        store = new MetadataStorage()
    }
  
    return store
}
