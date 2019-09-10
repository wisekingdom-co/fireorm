import { DynamicModule, Module } from '@nestjs/common'
import { FIREORM_INSTANCT } from './fireorm.constants';
import { Firestore } from '@google-cloud/firestore';
import { FireormModuleOptions, FireormModuleAsyncOptions } from './fireorm-options';
import { FactoryProvider } from '@nestjs/common/interfaces';
import { FireormFeatureOptions, createCollectionProviders } from './fireorm.providers';

@Module({})
export class FireormModule {
    static forRoot(options: FireormModuleOptions): DynamicModule {
        const firestoreProvider = {
            provide: FIREORM_INSTANCT,
            useFactory: () => new Firestore(options),
        }

        return {
            module: FireormModule,
            providers: [firestoreProvider],
            exports: [firestoreProvider],
        } as DynamicModule
    }

    static forRootAsync(options: FireormModuleAsyncOptions): DynamicModule {
        const firestoreProvider = {
            provide: FIREORM_INSTANCT,
            useFactory: options.useFactory,
            inject: options.inject || [],
        } as FactoryProvider

        return {
            module: FireormModule,
            imports: options.imports,
            providers: [firestoreProvider],
            exports: [firestoreProvider],
        }
    }

    static forFeature(options: FireormFeatureOptions): DynamicModule {
        const providers = createCollectionProviders(options)
        return {
            module: FireormModule,
            providers,
            exports: providers,
        }
    }
}
