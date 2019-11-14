import { IdProp, Prop, SubCollection } from "../../fireorm/src"
import { User } from "./User";

@SubCollection(() => User, 'version')
export class Version {
    @IdProp()
    id: string

    @Prop('string', { enums: [ 'MAJOR', 'MINER', 'PATCH' ] })
    type: 'MAJOR' | 'MINER' | 'PATCH'

    @Prop()
    value: string
}
