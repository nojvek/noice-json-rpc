import {Client, Server, JsonRpc2, MessageError} from '../lib/noice-json-rpc'
import {MockSocket, MockSocketServer} from './client-server.mock'
import {assert} from 'chai'
import {SinonSandbox, sandbox as SinonSandboxFactory} from 'sinon'


// MockApi tests that JsonRpc dynamically creates a proxy to abstract calls as functions

interface GameClient {
    help(params: {lives: number}): Promise<{acknowledged: boolean}>
    onLevelUp(handler: (event: {lives: number}) => void): void
    emitDying(params: {health: number}): void
}

interface GameServer {
    expose(module: {
        help: (params: {lives: number}) => JsonRpc2.PromiseOrNot<{acknowledged: boolean}>
    }): void
    emitLevelUp(event: {lives: number}): void
    onDying(handler: (event: {health: number}) => void): void
}

interface GameClientApi {
    game: GameClient
}

interface GameServerApi {
    game: GameServer
}

// Auto stringify expressions
const assertExpr = (expr: Function) => {
    assert(expr(), expr.toString())
}

const waitForNextTick = () => new Promise((resolve) => process.nextTick(resolve))

describe('Client', () => {
    let client: Client
    let server: Server
    let socket: MockSocket
    let sandbox: SinonSandbox

    beforeEach(() => {
        sandbox = SinonSandboxFactory.create()
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
        const api: GameClient = new Client(socket).api('') // No domain
        const send = sandbox.stub(socket, 'send')
        const callPromise = api.help({lives: 1})
        assertExpr(() => send.notCalled)
        socket.emit('open')
        assertExpr(() => send.calledWith(`{"id":1,"method":"help","params":{"lives":1}}`))
    })

    it('.call() resolves promise when server responds with a result and throws when error response', async () => {
        const api: GameClient = new Client(socket).api('')
        const resultPromise = api.help({lives: 1})
        socket.emit('open')
        socket.emit('message', `{"id":1,"result":{"acknowledged":true}}`)
        const result = await resultPromise // Promises are always async even when resolved
        assertExpr(() => result.acknowledged)

        const errorPromise = api.help({lives: 0})
        socket.emit('message', `{"id":2,"error":{"message":"Cannot help at level 0"}}`)

        try { await errorPromise }
        catch (e) {
            assertExpr(() => e.message === 'Cannot help at level 0')
        }
    })

    it('emits notifications from server', () => {
        const api: GameClient = new Client(socket).api('')
        const onLevelUp = sandbox.stub()
        api.onLevelUp(<any>onLevelUp)
        socket.emit('open')
        socket.emit('message', `{"method":"levelUp","params":{"level":2}}`)
        assertExpr(() => onLevelUp.calledWith({level: 2}))
    })

    it('.notify() sends notifications to server', () => {
        const api: GameClient = new Client(socket).api('')
        socket.emit('open')
        const send = sandbox.stub(socket, 'send')
        api.emitDying({health: 10})
        assertExpr(() => send.calledWith(`{"method":"dying","params":{"health":10}}`))
    })

    it('emits error when recieves malformed response', () => {
        client = new Client(socket)
        let errorMessage: string = ''
        client.on('error', (error: Error) => errorMessage = error.message)
        const assertErrorMessage = (expectedErrorMessage: string) => {
            assert.equal(expectedErrorMessage, errorMessage)
            errorMessage = ''
        }

        socket.emit('message', `{"id":1,"result":{"acknowledged":true}}`)
        assertErrorMessage('Response with id:1 has no pending request')

        socket.emit('message', null)
        assertErrorMessage('Message cannot be null, empty or undefined')

        socket.emit('message', '{badJson:true}')
        assertErrorMessage('Unexpected token b in JSON at position 1')

        socket.emit('message', `{"badMessage":true}`)
        assertErrorMessage('Invalid message: {"badMessage":true}')

        socket.emit('open')
        client.call('hello')
        socket.emit('message', `{"id":1,"badMessage":true}`)
        assertErrorMessage('Response must have result or error: {"id":1,"badMessage":true}')
    })

    it('.api creates a domained client by default', () => {
        const api: GameClientApi = new Client(socket).api()
        const resultPromise = api.game.help({lives: 1})
        const send = sandbox.stub(socket, 'send')
        socket.emit('open')
        assertExpr(() => send.calledWith(`{"id":1,"method":"game.help","params":{"lives":1}}`))
    })

    it('.api creates an object with Proxy prototype', () => {
        const api: GameClientApi = new Client(socket).api()
        assertExpr(() => (<any>api).prototype === Object.prototype)
    })

    it('.api throws error if ES6 Proxy not available', () => {
        const origProxy = Proxy
        Proxy = undefined
        assert.throws(() => new Client(socket).api())
        Proxy = origProxy
    })

    it('logs messages if logging options are passed', () => {
        client = new Client(socket, {logConsole: true, logEmit: true})
        const logConsole = sandbox.stub(console, 'log')
        const logEmit = sandbox.spy()

        socket.emit('open')
        client.on('send', logEmit)
        client.call('hello')

        assert(logEmit.calledOnce, 'logEmit.calledOnce')
        assert(logConsole.calledOnce, 'logEmit.calledOnce')
    })
})

describe('Server', () => {
    let server: Server
    let socketServer: MockSocketServer
    let socket: MockSocket
    let sandbox: SinonSandbox

    beforeEach(() => {
        sandbox = SinonSandboxFactory.create()
        socket = new MockSocket()
        socketServer = new MockSocketServer()
    })

    afterEach(() => {
        sandbox.restore()
    })

    it('fails on null server', () => {
        assert.throws(() => {
            server = new Server(null)
        }, TypeError)
    })

    it('logs notify messages if logging options are passed', () => {
        server = new Server(socketServer, {logConsole: true, logEmit: true})
        socketServer.clients = [ socket ]
        const logConsole = sandbox.stub(console, 'log')
        const logEmit = sandbox.spy()

        server.on('send', logEmit)
        server.notify('hello')

        assert(logEmit.calledOnce, 'logEmit.calledOnce')
        assert(logConsole.calledOnce, 'logEmit.calledOnce')
    })

    it('.api.emitXYZ() broadcasts XYZ message ', () => {
        const api: GameServer = new Server(socketServer).api('')
        socketServer.clients = [ socket ]
        const send = sandbox.stub(socket, 'send')
        api.emitLevelUp({lives: 2})
        assertExpr(() => send.calledWith(`{"method":"levelUp","params":{"lives":2}}`))
    })

    it('.api.onXYZ is called when client sends a notification', () => {
        const api: GameServer = new Server(socketServer).api('')
        socketServer.emit('connection', socket)
        const onDying = sandbox.stub()
        api.onDying(<any>onDying)
        socket.emit('message', `{"method":"dying","params":{"health":2}}`)
        assertExpr(() => onDying.calledWith({health: 2}))
    })

    it('.api.expose can expose functions and reply to requests', async () => {
        const api: GameServerApi = new Server(socketServer).api()
        socketServer.emit('connection', socket)
        const send = sandbox.stub(socket, 'send')

        // Returns promise
        api.game.expose({
            help({lives}) {
                assert.equal(lives, 2)
                return Promise.resolve({acknowledged: false})
            }
        })

        socket.emit('message', `{"id":1,"method":"game.help","params":{"lives":2}}`)
        await waitForNextTick()
        assertExpr(() => send.lastCall.calledWith(`{"id":1,"result":{"acknowledged":false}}`))

        // Returns object
        api.game.expose({
            help({lives}) {
                assert.equal(lives, 2)
                return {acknowledged: true}
            }
        })

        socket.emit('message', `{"id":2,"method":"game.help","params":{"lives":2}}`)
        assertExpr(() => send.lastCall.calledWith(`{"id":2,"result":{"acknowledged":true}}`))
    })

    it('handles errors on api and requests gracefully', async () => {
        const api: GameServer = new Server(socketServer, {logConsole: false}).api('')
        socketServer.emit('connection', socket)

        assert.throws(() => {
            api.expose(<any>'blah')
        }, 'Expected an iterable object to expose functions')

        // Only on_, emit_ and expose props are valid on API
        assert.equal((<any>api).hello, undefined)

        // Error on exposed function
        api.expose({
            help({lives}): any {
                throw new Error('Server made a boo boo')
            }
        })

        // Internal Error
        const send = sandbox.stub(socket, 'send')
        socket.emit('message', `{"id":1,"method":"help","params":{"lives":2}}`)
        assertExpr(() => send.lastCall.calledWith(`{"id":1,"error":{"code":-32603,"message":"InternalError: Internal Error when calling 'help'","data":"Server made a boo boo"}}`))

        // Error via promise
        api.expose({
            help({lives}): Promise<any> {
                return Promise.reject(new Error('Server made async boo boo'))
            }
        })

        socket.emit('message', `{"id":1,"method":"help","params":{"lives":2}}`)
        await waitForNextTick()
        assertExpr(() => send.lastCall.calledWith(`{"id":1,"error":{"code":-32603,"message":"InternalError: Internal Error when calling 'help'","data":"Server made async boo boo"}}`))

        // Json Error
        socket.emit('message', `blah blah blah`)
        assertExpr(() => send.lastCall.calledWith(`{"id":-1,"error":{"code":-32700,"message":"ParseError: invalid JSON received"}}`))

        // Invalid Request
        socket.emit('message', `{"id":1}`)
        assertExpr(() => send.lastCall.calledWith(`{"id":1,"error":{"code":-32600,"message":"InvalidRequest: JSON sent is not a valid request object"}}`))

        // Method not found
        socket.emit('message', `{"id":1,"method":"yo"}`)
        assertExpr(() => send.lastCall.calledWith(`{"id":1,"error":{"code":-32601,"message":"MethodNotFound: 'yo' wasn't found"}}`))
    })

    it('throws error if broadcasting notify messages is not supported', () => {
        server = new Server(socketServer)
        assert.throws(() => server.notify('hello'), `SocketServer does not support broadcasting. No "clients: LikeSocket[]" property found`)
    })

    it('.api creates an object with Proxy prototype', () => {
        const api = new Server(socketServer).api()
        assertExpr(() => (<any>api).prototype === Object.prototype)
    })

    it('.api throws error if ES6 Proxy not available', () => {
        const origProxy = Proxy
        Proxy = undefined
        assert.throws(() => new Server(socketServer).api())
        Proxy = origProxy
    })

    describe('Client MessageError', () => {
        it('returns the values supplied in the constructor for the getters', () => {
            const error = new MessageError({code: 1234, message: 'Some error happened', data: 'custom data'});
            assert.equal(error.code, 1234);
            assert.equal(error.message, 'Some error happened');
            assert.equal(error.data, 'custom data');
        })
    })
});
