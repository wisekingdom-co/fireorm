import { Global, Module, DynamicModule } from "@nestjs/common";
import { FIRESTORE_INSTANCT } from "./fireorm.constants";
import { Firestore } from "@google-cloud/firestore";
import { FireOrmModuleOptions, FireOrmModuleAsyncOptions } from "./fireorm-options";
import { FactoryProvider } from "@nestjs/common/interfaces";

@Global()
@Module({})
export class FirestoreModule {
    static forRoot(options: FireOrmModuleOptions): DynamicModule {
        const firestoreProvider = {
            provide: FIRESTORE_INSTANCT,
            useFactory: () => new Firestore(options),
        }

        return {
            module: FirestoreModule,
            providers: [firestoreProvider],
            exports: [firestoreProvider],
        } as DynamicModule
    }

    static forRootAsync(options: FireOrmModuleAsyncOptions): DynamicModule {
        const firestoreProvider = {
            provide: FIRESTORE_INSTANCT,
            useFactory: options.useFactory,
            inject: options.inject || [],
        } as FactoryProvider

        return {
            module: FirestoreModule,
            imports: options.imports,
            providers: [firestoreProvider],
            exports: [firestoreProvider],
        }
    }
}