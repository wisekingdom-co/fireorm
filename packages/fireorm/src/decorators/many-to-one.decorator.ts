import { getMetadataStorage, RelationMetadataArgs } from "../metadata-storage";
import { Transform, TransformationType } from "class-transformer";
import { ObjectType } from "../common";
import * as R from 'ramda'

export function ManyToOne<T>(typeFunc: () => ObjectType<T>, collectionType?: () => ObjectType<T>, inverseSide?: string): Function {
    return function (object: Object, propertyName: string) {
        Transform((value: any, _: any, transformationType: TransformationType) => {
            const collectionPath = getMetadataStorage().getCollectionPath(collectionType ? collectionType() : typeFunc())
            const idPropertyName = getMetadataStorage().getIdProp(collectionType ? collectionType() : typeFunc()).propertyName

            if (transformationType === TransformationType.PLAIN_TO_CLASS) {
                return value
            } else if (transformationType === TransformationType.CLASS_TO_PLAIN) {
                if (typeof value === 'string') {
                    return { $ref: { id: value, path: collectionPath } }
                }
                if (value instanceof Array && inverseSide) {
                    const path = collectionPath + "/" + R.compose(
                        R.join('/'),
                        R.flatten,
                        R.addIndex(R.map)((propName, propIndex) => {
                          return [value[propIndex], propName]
                        }),
                        R.split('.')
                    )(inverseSide)
                    return { $ref: { id: value[value.length -1], path } }
                }
                return { $ref: { id: value[idPropertyName], path: collectionPath } }
            }
            return value
        })(object, propertyName)

        getMetadataStorage().relations.push({
            target: object.constructor,
            propertyName: propertyName,
            relationType: 'many-to-one',
            inverseSide,
            type: typeFunc,
        } as RelationMetadataArgs)
    }
}