import { FindOneOptions, FindManyOptions } from "./find-options"

export class FindOptionsUtils {
    static isFindOneOptions(obj: any): obj is FindOneOptions<any> {
        const possibleOptions: FindOneOptions<any> = obj
        return possibleOptions &&
                (
                    possibleOptions.where instanceof Object ||
                    typeof possibleOptions.where === "string" ||
                    possibleOptions.relations instanceof Array ||
                    possibleOptions.order instanceof Object ||
                    typeof possibleOptions.cache === "boolean" ||
                    typeof possibleOptions.cache === "number"
                )
    }

    static isFindManyOptions(obj: any): obj is FindManyOptions<any> {
        const possibleOptions: FindManyOptions<any> = obj
        return possibleOptions && (
            this.isFindOneOptions(possibleOptions) ||
            typeof (possibleOptions as FindManyOptions<any>).limit === "number" ||
            typeof (possibleOptions as FindManyOptions<any>).offset === "number"
        )
    }
}