import { EntitySchema, CollectionRepository, CollectionGroupRepository } from '@isman/fireorm'
import { getCollectionToken } from './fireorm.utils'
import { Firestore } from '@google-cloud/firestore'
import { FIRESTORE_INSTANCT } from './fireorm.constants'
import { Module } from '@nestjs/common'
import { FactoryProvider } from '@nestjs/common/interfaces'

export interface CollectionGroupEntityOptions {
    collectionId: string
    entity: EntitySchema<any>
}

export interface FireOrmFeatureOptions {
    collections?: EntitySchema<any>[]
    collectionGroups?: CollectionGroupEntityOptions[]
}

export function createCollectionProviders(options: FireOrmFeatureOptions) {
    let collectionProvide = [] as FactoryProvider<any>[]
    if (options.collections) {
        collectionProvide = options.collections.map(collection => ({
            provide: getCollectionToken(collection.name),
            useFactory: (firestore: Firestore) => CollectionRepository.getRepository(collection, firestore),
            inject: [FIRESTORE_INSTANCT],
        }))
    }
    let collectionGroupProvide = [] as FactoryProvider<any>[]
    if (options.collectionGroups) {
        collectionGroupProvide = options.collectionGroups.map(collection => ({
            provide: getCollectionToken(collection.entity.name),
            useFactory: (firestore: Firestore) => CollectionGroupRepository.getRepository(collection.entity, firestore, collection.collectionId),
            inject: [FIRESTORE_INSTANCT],
        }))
    }
    return [...collectionProvide, ...collectionGroupProvide]
}
