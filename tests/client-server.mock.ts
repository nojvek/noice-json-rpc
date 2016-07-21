import {LikeSocket, LikeSocketServer} from '../lib/noice-json-rpc'
import {EventEmitter} from 'events'

export class MockSocket extends EventEmitter implements LikeSocket {
    send(message: string) {
    }
}

export class MockSocketServer extends EventEmitter implements LikeSocketServer {
}