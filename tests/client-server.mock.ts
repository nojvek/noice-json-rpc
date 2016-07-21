import {LikeSocket, LikeSocketServer} from '../lib/noice-json-rpc'

export class MockSocket implements LikeSocket {
    send(message: string) {
    }

    on(event: string, cb: Function) {
    }

    removeListener(event: string, cb: Function) {
    }
}

export class MockSocketServer implements LikeSocketServer {
    on(event: string, cb: Function) {
    }

    removeListener(event: string, cb: Function) {
    }
}