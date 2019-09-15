import { EntitySchema, CollectionRepository } from '@isman/fireorm';
import { getCollectionToken } from './fireorm.utils';
import { Firestore } from '@google-cloud/firestore';
import { FIRESTORE_INSTANCT } from './fireorm.constants';

export interface FireOrmFeatureOptions {
    collections: EntitySchema<any>[]
}

export function createCollectionProviders(options: FireOrmFeatureOptions) {
    return options.collections.map(collection => ({
        provide: getCollectionToken(collection.name),
        useFactory: (firestore: Firestore) => CollectionRepository.getRepository(collection, firestore),
        inject: [FIRESTORE_INSTANCT],
    }))
}
