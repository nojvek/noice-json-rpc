import * as fs from 'fs'
import * as WebSocket from 'ws'
import WebSocketServer = WebSocket.Server
import * as http from 'http'
import Crdp from 'chrome-remote-debug-protocol'
import DevToolsProtocol from 'devtools-protocol'
import * as rpc from '../lib/noice-json-rpc'

async function setupClient() {
    try {
        const rpcClient = new rpc.Client(new WebSocket('ws://localhost:8080'), {logConsole: true})
        const api: DevToolsProtocol.ProtocolApi = rpcClient.api()

        await Promise.all([
            api.Runtime.enable(),
            api.Debugger.enable(),
            api.Profiler.enable(),
        ])

        await api.Profiler.start()
        await new Promise((resolve) => api.Runtime.on('executionContextDestroyed', resolve)); // Wait for event
        const result = await api.Profiler.stop()

        console.log('Result', result)
        process.exit(0)

    } catch (e) {
        console.error(e)
    }
}

function setupServer() {
    const wssServer = new WebSocketServer({port: 8080});
    const api: Crdp.CrdpServer = new rpc.Server(wssServer).api();

    const enable = () => Promise.resolve()

    api.Debugger.expose({enable})
    api.Profiler.expose({enable})
    api.Runtime.expose({
        enable,
    })
    api.Profiler.expose({
        enable,
        start() {
            setTimeout(() => {
                api.Runtime.emitExecutionContextDestroyed({executionContextId: 1})
            }, 1000)
            return Promise.resolve()
        },
        stop() {
            const response: Crdp.Profiler.StopResponse = {
                profile: {
                    nodes: [],
                    startTime: 0,
                    endTime: 100
                }
            }
            return Promise.resolve(response)
        }
    })

}

setupServer()
setupClient()
