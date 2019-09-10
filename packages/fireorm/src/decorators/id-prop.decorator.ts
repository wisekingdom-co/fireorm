import { getMetadataStorage, IdPropertyMetadataArgs } from "../metadata-storage";
import { Expose } from "class-transformer";

export interface IdPropertyOptions {
    name?: string
}

export function IdProp(strategy?: 'uuid/v1' | 'uuid/v4' | 'auto' | (() => string), options: IdPropertyOptions = {}): Function {
    return function (object: Object, propertyName: string) {
        Expose({ name: options.name })(object, propertyName)
        getMetadataStorage().ids.push({
            target: object.constructor,
            propertyName: propertyName,
            strategy,
            options
        } as IdPropertyMetadataArgs);
    }
}