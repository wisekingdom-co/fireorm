import 'reflect-metadata'
import { Prop, Collection, IdProp, CollectionRepository, ArraContains, Ref } from '../src';
import { Firestore } from '@google-cloud/firestore';


class Addess {
    @Prop()
    address: string

    @Prop()
    provice: string

    @Prop()
    postcode: string
}

@Collection()
class App {
    @IdProp()
    id: string

    @Prop() 
    title: string
}

@Collection("users", { prefix: "app_" })
class User {
    @IdProp("uuid/v1")
    id: string

    @Prop() 
    email: string

    @Prop()
    name: string

    @Prop(() => Addess)
    address: Addess

    @Prop()
    tags: string[]

    @Prop(() => Date, { default: () => new Date() })
    create_date: Date

    @Prop()
    app: Ref<App>

    toDto() {
        return {
            id: this.id,
            name: this.name,
            create_date: this.create_date,
        }
    }
}

const firestore = new Firestore({
    projectId: 'functions-nextjs',
    credentials: require('./functions-nextjs-firebase-adminsdk-r5j5s-516be783f5.json')
})

async function run () {
    const userRepo = CollectionRepository.getRepository(firestore, User)

    const newPerson1 = new User()
    newPerson1.name = 'Isman Usoh'
    newPerson1.email = 'isman.usoh@gmail.com'
    newPerson1.tags = ["mele", "31"]

    const newPerson2 = new User()
    newPerson2.name = 'Maisaroh Tuengngoh'
    newPerson2.email = 'ooaokoo@gmail.com'
    newPerson2.tags = ["femele", "30"]
    // newPerson2.create_date = new Date()

    // const result=  await userRepo.save([newPerson1, newPerson2])
    // console.error('result', result)

    const docs = await userRepo.find({ tags: ArraContains("femele") })
    console.error("docs", docs.map(doc => doc.toDto()))

    // await personRepo.transaction(async (tnx) => {
    //     tnx.create(Person, { email: "gmail.com" })
    //     tnx.create(App, { title: "Demo" })
    // })

    
    // await personRepo.update("QF9uOKXqv7gQJs2oxrhL", { name: 'Google', 'tags.$0': 'hello11' })
    // await personRepo.delete(['QF9uOKXqv7gQJs2oxrhL', 'u35mNgpfdd35JsSAGcYL'])
}

try {
    run() 
} catch (error) {
    console.error('error', error)
}
