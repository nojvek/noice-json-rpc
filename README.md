# Noice Json Rpc
[![build status](https://travis-ci.org/nojvek/noice-json-rpc.svg?branch=master)](https://travis-ci.org/nojvek/noice-json-rpc)

Client and Server classes to implement a jsonrpc2 protocol.

## Example

```js
import * as WebSocket from 'ws'
import WebSocketServer = WebSocket.Server
import * as rpc from 'noice-json-rpc'

async function setupClient() {
    try {
        const api = new rpc.Client(new WebSocket("ws://localhost:8080"), {logConsole: true}).api()

        await Promise.all([
            api.Runtime.enable(),
            api.Debugger.enable(),
            api.Profiler.enable(),
            api.Runtime.run(),
        ])

        await api.Profiler.start()
        await new Promise((resolve) => api.Runtime.onExecutionContextDestroyed(resolve)); // Wait for event
        await api.Profiler.stop()

    } catch (e) {
        console.error(e)
    }
}

function setupServer() {
    const wssServer = new WebSocketServer({port: 8080});
    const api = new rpc.Server(wssServer).api();

    const enable = () => {}

    api.Debugger.expose({enable})
    api.Profiler.expose({enable})
    api.Runtime.expose({
        enable,
        run() {}
    })
    api.Profiler.expose({
        enable,
        start() {
            setTimeout(() => {
                api.Runtime.emitExecutionContextDestroyed()
            }, 1000)
        },
        stop() {
            return {data: "noice!"}
        }
    })

}

setupServer()
setupClient()
```

Output

```
Client > {"id":1,"method":"Runtime.enable"}
Client > {"id":2,"method":"Debugger.enable"}
Client > {"id":3,"method":"Profiler.enable"}
Client > {"id":4,"method":"Runtime.run"}
Client < {"id":1,"result":{}}
Client < {"id":2,"result":{}}
Client < {"id":3,"result":{}}
Client < {"id":4,"result":{}}
Client > {"id":5,"method":"Profiler.start"}
Client < {"id":5,"result":{}}
Client < {"method":"Runtime.executionContextDestroyed"}
Client > {"id":6,"method":"Profiler.stop"}
Client < {"id":6,"result":{"data":"noice!"}}
```
