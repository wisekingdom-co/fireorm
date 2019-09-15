import 'reflect-metadata'
import { Prop, Collection, IdProp, CollectionRepository, ArraContains, Ref, ManyToOne } from '../fireorm/src';
import { Firestore } from '@google-cloud/firestore';
import { App } from './models/App';
import { User } from './models/User';
import { Version } from './models/Version';
import { version } from 'punycode';

const firestore = new Firestore({
    projectId: 'functions-nextjs',
    credentials: require('./functions-nextjs-firebase-adminsdk-r5j5s-516be783f5.json')
})

firestore.settings({
    timestampsInSnapshots: true
})

async function run () {
    // const appRepo = CollectionRepository.getRepository(App, firestore)
    // const versionRepo = appRepo.getSubRepository(Version, 'versions', '')
    const userRepo = CollectionRepository.getRepository(App, firestore)


    const newUser = new User()
    newUser.name = "Isman Usoh"
    newUser.email = 'isman.usoh@gmail.com'

    await userRepo.save(newUser)

    // const newApp = await appRepo.create({ title: "Hello World" })
    // console.error("App", newApp)
    
    // const versionRepo = appRepo.getSubRepository(Version, 'versions', newApp.id)

    // await versionRepo.create([{ type: 'MAJOR', value: '2.0.0' }, { type: 'MINER', value: '2.1.0' }])
    // await new Promise((resove) => setTimeout(resove, 800))
    // const versions = await versionRepo.find()
    // console.error("Versions", 8GPlBJXmbQf0z4JVf3ug)
}

try {
    run() 
} catch (error) {
    console.error('error', error)
}
