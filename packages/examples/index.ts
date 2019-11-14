import 'reflect-metadata'
import { Firestore } from '@google-cloud/firestore'
import { CollectionRepository } from '../fireorm/src'
import { User } from './models/User'

const firestore = new Firestore({
    projectId: 'functions-nextjs',
    credentials: require('./functions-nextjs-firebase-adminsdk-r5j5s-516be783f5.json')
})

firestore.settings({
    timestampsInSnapshots: true
})

async function run () {
    const userRepo = CollectionRepository.getRepository(User, firestore)

    const doc = await userRepo.find({
        where: {
            id: '469a4b20-d7ff-11e9-b438-6b28de712880'
        },
        relations: ["version"]
    })
    console.error('doc', doc)
}

try {
    run() 
} catch (error) {
    console.error('error', error)
}
