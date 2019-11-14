import { DynamicModule, Module } from '@nestjs/common'
import { FireOrmModuleOptions, FireOrmModuleAsyncOptions } from './fireorm-options'
import { FirestoreModule } from './firestore.module'
import { FireOrmFeatureOptions, createCollectionProviders } from './fireorm.providers'

@Module({})
export class FireOrmModule {
    static forRoot(options: FireOrmModuleOptions): DynamicModule {
        return {
            module: FireOrmModule,
            imports: [FirestoreModule.forRoot(options)],
        }
    }

    static forRootAsync(options: FireOrmModuleAsyncOptions): DynamicModule {
        return {
            module: FirestoreModule,
            imports: [FirestoreModule.forRootAsync(options)],
        }
    }

    static forFeature(options: FireOrmFeatureOptions): DynamicModule {
        const providers = createCollectionProviders(options)
        return {
            module: FirestoreModule,
            providers,
            exports: providers,
        }
    }
}
