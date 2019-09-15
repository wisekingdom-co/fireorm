import { IdProp, Prop } from "../../fireorm/src";
import { SubCollection } from "../../fireorm/src/decorators";

@SubCollection()
export class Version {
    @IdProp()
    id: string

    @Prop('string', { enums: [ 'MAJOR', 'MINER', 'PATCH' ] })
    type: 'MAJOR' | 'MINER' | 'PATCH'

    @Prop()
    value: string
}
