import {Client, Server} from '../lib/noice-json-rpc'
import {assert} from 'chai'

describe('Client', () => {
    let client: Client

    it('fails on null socket', ()=> {
        assert.throws(() => {
            client = new Client(null)
        }, TypeError)
    })
})

describe('Server', () => {
    let server: Server

    it('fails on null server', ()=> {
        assert.throws(() => {
            server = new Server(null)
        }, TypeError)
    })
})