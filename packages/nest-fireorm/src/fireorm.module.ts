import { DynamicModule, Module } from '@nestjs/common'
import { FireormModuleOptions, FireormModuleAsyncOptions } from './fireorm-options';
import { FirestoreModule } from './firestore.module';
import { FireormFeatureOptions, createCollectionProviders } from './fireorm.providers';

@Module({})
export class FireormModule {
    static forRoot(options: FireormModuleOptions): DynamicModule {
        return {
            module: FireormModule,
            imports: [FirestoreModule.forRoot(options)],
        }
    }

    static forRootAsync(options: FireormModuleAsyncOptions): DynamicModule {
        return {
            module: FirestoreModule,
            imports: [FirestoreModule.forRootAsync(options)],
        }
    }

    static forFeature(options: FireormFeatureOptions): DynamicModule {
        const providers = createCollectionProviders(options)
        return {
            module: FirestoreModule,
            providers,
            exports: providers,
        }
    }
}
