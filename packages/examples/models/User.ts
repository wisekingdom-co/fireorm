import { Collection, IdProp, Prop, ManyToOne, Ref } from "../../fireorm/src";
import { App } from './App'
import { Version } from "./Version";

export class AddessEmbed {
    @Prop()
    address: string

    @Prop()
    provice: string

    @Prop()
    postcode?: string
}

export class ContactEmbed {
    @Prop()
    type: string
    @Prop()
    value: string
}


@Collection("users", { prefix: "example_" })
export class User {
    @IdProp("uuid/v1")
    id: string

    @Prop() 
    email: string

    @Prop()
    name: string

    @Prop(() => AddessEmbed)
    address: AddessEmbed

    @Prop()
    tags: string[]

    @Prop()
    contacts: ContactEmbed[]

    @Prop('date')
    create_date: Date

    @Prop('array')
    multiple_date: Date[]

    @ManyToOne(() => App)
    app: Ref<App>

    toDto() {
        return {
            id: this.id,
            name: this.name,
            create_date: this.create_date,
        }
    }
}