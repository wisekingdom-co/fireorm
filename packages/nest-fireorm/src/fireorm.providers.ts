import { EntitySchema, CollectionRepository } from '@isman/fireorm';
import { getCollectionToken } from './fireorm.utils';
import { Firestore } from '@google-cloud/firestore';
import { FIRESTORE_INSTANCT } from './fireorm.constants';

export interface FireormFeatureOptions {
    collections: EntitySchema<any>[]
}

export function createCollectionProviders(options: FireormFeatureOptions) {
    return options.collections.map(collection => ({
        provide: getCollectionToken(collection.name),
        useFactory: (firestore: Firestore) => CollectionRepository.getCollectionRepository(collection, firestore),
        inject: [FIRESTORE_INSTANCT],
    }))
}
