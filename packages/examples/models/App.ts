import { Collection, IdProp, Prop, OneToMany, SubCollectionProp } from "../../fireorm/src";
import { User } from './User'
import { Version } from "./Version";

@Collection("apps", { prefix: "example_" })
export class App {
    @IdProp()
    id: string

    @Prop() 
    title: string

    @OneToMany(() => User, 'app')
    users: User[]

    @SubCollectionProp(() => Version) 
    versions: Version[]
}