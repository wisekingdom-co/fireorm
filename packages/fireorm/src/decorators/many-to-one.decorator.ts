import { getMetadataStorage, RelationMetadataArgs } from "../metadata-storage";
import { Transform, TransformationType } from "class-transformer";
import { ObjectType } from "../common";

export function ManyToOne<T>(typeFunc: () => ObjectType<T>): Function {
    return function (object: Object, propertyName: string) {
        Transform((value: any, _: any, transformationType: TransformationType) => {
            const collectionPath = getMetadataStorage().getCollectionPath(typeFunc())
            const idPropertyName = getMetadataStorage().getIdProp(typeFunc()).propertyName

            if (transformationType === TransformationType.PLAIN_TO_CLASS) {
                if (typeof value === 'string') {
                    return {
                        [idPropertyName]: value
                    }
                }
                return value
            } else if (transformationType === TransformationType.CLASS_TO_PLAIN) {
                if (typeof value === 'string') {
                    return { $ref: { id: value, path: collectionPath } }
                }
                return { $ref: { id: value[idPropertyName], path: collectionPath } }
            }
            return value
        })(object, propertyName)

        getMetadataStorage().relations.push({
            target: object.constructor,
            propertyName: propertyName,
            relationType: 'many-to-one',
            type: typeFunc,
        } as RelationMetadataArgs)
    }
}