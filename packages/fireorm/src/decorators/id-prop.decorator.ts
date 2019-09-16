import { getMetadataStorage, IdPropertyMetadataArgs } from "../metadata-storage";

export function IdProp(strategy?: 'uuid/v1' | 'uuid/v4' | 'auto' | (() => string)): Function {
    return function (object: Object, propertyName: string) {
        getMetadataStorage().ids.push({
            target: object.constructor,
            propertyName: propertyName,
            strategy,
        } as IdPropertyMetadataArgs);
    }
}