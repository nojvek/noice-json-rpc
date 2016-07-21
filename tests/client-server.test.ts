import {Client, Server} from '../lib/noice-json-rpc'
import {MockSocket, MockSocketServer} from './client-server.mock'
import * as sinon from 'sinon'
import {assert} from 'chai'

//TODO: Get 100% test coverage.

describe('Client', () => {
    let client: Client
    let socket: MockSocket

    beforeEach(() => {
        socket = new MockSocket()
    })

    it('fails on null socket', ()=> {
        assert.throws(() => {
            client = new Client(null)
        }, TypeError)
    })

    it('waits for socket to be opened before sending message', ()=> {
    })

    it('.call() resolves promise when server responds with a result', ()=> {
    })

    it('.call() rejects promise when server responds with an error', ()=> {
    })

    it('emits notifications from server', ()=> {
    })

    it('emits error when recieves malformed json', ()=> {
    })

    it('emits error when recieves `null` request', ()=> {
    })

    it('emits error when message with unrecognized id is received', ()=> {
    })

    it('emits error when message is malformed', ()=> {
    })

    it('logs messages if logging options are passed', () => {
        // TODO: make call synchronous
        // client = new Client(socket, {logConsole: true, logEmit: true})
        // const emit = sinon.spy(client, 'emit')
        // const log = sinon.spy(console, 'log')
        // socket.emit('open')
        // client.call('hello')
        // process.nextTick(() => {
        //     sinon.assert.calledOnce(emit)
        //     sinon.assert.calledOnce(log)
        //     done()
        // })
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