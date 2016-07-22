import {Client, Server} from '../lib/noice-json-rpc'
import {MockSocket, MockSocketServer} from './client-server.mock'
import {assert} from 'chai'
import * as sinon from 'sinon'

// TODO: Get 100% test coverage.

// Auto stringify expressions
const asserExpr = (expr: Function) => {
    assert(expr(), expr.toString())
}

describe('Client', () => {
    let client: Client
    let socket: MockSocket
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.sandbox.create()
        socket = new MockSocket()
    })

    afterEach(() => {
        sandbox.restore()
    })

    it('fails on null socket', () => {
        assert.throws(() => {
            client = new Client(null)
        }, TypeError)
    })

    it('waits for socket to be opened before sending message', () => {
    })

    it('.call() resolves promise when server responds with a result', () => {
    })

    it('.call() rejects promise when server responds with an error', () => {
    })

    it('emits notifications from server', () => {
    })

    it('.notify() sends notifications to server', () => {
        client = new Client(socket, {logConsole: true})
        socket.emit('open')
        const send = sandbox.stub(socket, 'send')
        client.notify('dying', {health: 10})
        asserExpr(() => send.calledWith(`{"method":"dying","params":{"health":10}}`))
    })

    it('emits error when recieves malformed json', () => {
    })

    it('emits error when recieves `null` request', () => {
    })

    it('emits error when message with unrecognized id is received', () => {
    })

    it('emits error when message is malformed', () => {
    })

    it('logs messages if logging options are passed', () => {
        client = new Client(socket, {logConsole: true, logEmit: true})
        const logConsole = sandbox.stub(console, 'log')
        const logEmit = sandbox.spy()

        socket.emit('open')
        client.on('send', logEmit)
        client.call('hello')

        assert(logEmit.calledOnce, "logEmit.calledOnce")
        assert(logConsole.calledOnce, "logEmit.calledOnce")
    })
})

describe('Server', () => {
    let server: Server

    it('fails on null server', () => {
        assert.throws(() => {
            server = new Server(null)
        }, TypeError)
    })
})
