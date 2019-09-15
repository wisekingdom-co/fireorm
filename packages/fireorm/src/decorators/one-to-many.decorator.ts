
import { getMetadataStorage } from "../metadata-storage";
import { ObjectType } from "../common";

export function OneToMany<T>(typeFunc: () => ObjectType<T>, inverseSide: keyof T): Function {
    return function (object: Object, propertyName: string) {

        getMetadataStorage().relations.push({
            target: object.constructor,
            propertyName: propertyName,
            relationType: 'one-to-many',
            inverseSide: inverseSide as string,
            type: typeFunc,
        })
    }
}