import { Type, DynamicModule, ForwardReference } from '@nestjs/common/interfaces'
import { Firestore } from '@google-cloud/firestore';

export type FireOrmModuleOptions = FirebaseFirestore.Settings

export interface FireOrmModuleAsyncOptions {
    imports?: Array<Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference>;
    useFactory: (...args: any[]) => Promise<Firestore> | Firestore
    inject?: any[]
}
