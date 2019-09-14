import { getMetadataStorage, PropertyMetadataArgs } from "../metadata-storage";
import { Type, Expose, Transform } from "class-transformer";
import { IsString, IsDecimal, IsInt, IsNumber, MinLength, MaxLength, Min, Max, IsEnum, IsArray, ArrayMaxSize, ArrayMinSize } from 'class-validator'

export type SimpleColumnType = 'string' | 'number' | 'float' | 'integer' | 'boolean' | 'date' | 'array'

export interface CommonPropertyOptions {
    name?: string
    default?: any | (() => any)
}

export interface StringPropertyOptions extends CommonPropertyOptions {
    minLenght?: number
    maxLenght?: number
    enums?: string[]
}

export interface NumberPropertyOptions extends CommonPropertyOptions {
    min?: number
    max?: number
}

export interface ArrayPropertyOptions extends CommonPropertyOptions {
    elementType?: SimpleColumnType | ((type?: any) => Function)
    minSize?: number
    maxSize?: number
}

export interface DatePropertyOptions extends CommonPropertyOptions {
    minDate?: number
    maxDate?: number
}

export type PropertyOptions = CommonPropertyOptions & StringPropertyOptions & NumberPropertyOptions & ArrayPropertyOptions & DatePropertyOptions 

export function Prop(): Function;

export function Prop(type?: 'string', options?: StringPropertyOptions): Function;

export function Prop(type?: 'number' | 'float' | 'integer', options?: NumberPropertyOptions): Function;

export function Prop(type?: 'array', options?: ArrayPropertyOptions): Function;

export function Prop(type?: 'date', options?: DatePropertyOptions): Function;

export function Prop(type?: 'boolean', options?: CommonPropertyOptions): Function;

export function Prop(type?: (type?: any) => Function): Function;

export function Prop(type?: SimpleColumnType | ((type?: any) => Function), options: PropertyOptions = {}): Function {
    return function (object: Object, propertyName: string) {
        if (!type) {
            type = Reflect.getMetadata("design:type", object, propertyName).name.toLowerCase();
        }

        Expose({ name: options.name })(object, propertyName)
        if (options.default && typeof options.default === 'function') {
            Transform((value: any) => value || options.default() || null)(object, propertyName)
        }
        if (options.default && typeof options.default !== 'function') {
            Transform((value: any) => value || options.default || null)(object, propertyName)
        }

        if (type === 'array') {
            IsArray()(object, propertyName)

            if (options.maxSize) {
                ArrayMaxSize(options.maxSize)
            }
            if (options.minSize) {
                ArrayMinSize(options.minSize)
            }
            classValidate(type, options, true)(object, propertyName)
        } else if (type) {
            classValidate(type, options, false)(object, propertyName)
        }
        
        
        getMetadataStorage().properties.push({
            target: object.constructor,
            propertyName: propertyName,
            type: type,
            options,
        } as PropertyMetadataArgs);
    }
}

const classValidate = (type: any, options: any, each: boolean) => {
    return function (object: Object, propertyName: string) {
        if (typeof type === 'function') {
            Type(type)(object, propertyName)
        } else {
            if (type === 'string') {
                if (options.enums) {
                    IsEnum(options.enums, { each })(object, propertyName)
                }
                IsString()(object, propertyName)
                if (options.minLenght) {
                    MinLength(options.minLenght)(object, propertyName)
                }
                if (options.maxLenght) {
                    MaxLength(options.maxLenght)(object, propertyName)
                }
            }
            if (type === 'number') {
                IsNumber(undefined, { each })(object, propertyName)
            }
            if (type === 'float') {
                IsDecimal(undefined, { each })(object, propertyName)
            }
            if (type === 'integer') {
                IsInt({ each })(object, propertyName)
            }
            if (options.min) {
                Min(options.min, { each })(object, propertyName)
            }
            if (options.max) {
                Max(options.max, { each })(object, propertyName)
            }
        }
    }
}