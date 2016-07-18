http = require 'http'
promisify = require 'promisify-node'
fs = promisify 'fs'
fetch = require 'node-fetch'
async = require('es6-simple-async');
exec = require('child_process').exec
log = jake.logger.log
error = jake.logger.error

## Tasks
task 'default', ['download-protocols']

desc 'Download latest protocol.json files from Chromium source and append typescript protocol stub to them'
task 'download-protocols', async: true, async ->
    try
        jsProtocolUrl = "https://chromium.googlesource.com/chromium/src/+/master/third_party/WebKit/Source/platform/v8_inspector/js_protocol.json"
        browserProtocolUrl = "https://chromium.googlesource.com/chromium/src/+/master/third_party/WebKit/Source/core/inspector/browser_protocol.json"
        protocolDefDir = "#{__dirname}/generator/protocolDef"
        jsProtocolStr = getProtocolDefHeader(jsProtocolUrl) + yield fetchProtocolJson("#{jsProtocolUrl}?format=TEXT")
        browserProtocolStr = getProtocolDefHeader(browserProtocolUrl) + yield fetchProtocolJson("#{browserProtocolUrl}?format=TEXT")
        yield fs.writeFile("#{protocolDefDir}/js_protocol.ts", jsProtocolStr ,'utf-8')
        yield fs.writeFile("#{protocolDefDir}/browser_protocol.ts", browserProtocolStr ,'utf-8')
        log("protocolDefs updated")
    catch e
        error(e.message)

    complete()


### Helpers ###
getProtocolDefHeader = (url) ->
    "// Auto-generated from #{url}\n" +
    "import {IProtocol} from '../protocol'\n" +
    'export const protocol: IProtocol =\n'

fetchProtocolJson = async (url) ->
    log("Downloading #{url}")
    res = yield fetch(url)
    contents = yield res.text()
    # googlesource returns base64 encoded string, so lets decode it
    return Buffer.from(contents, 'base64').toString()

# Promisified version of exec
exc  = (cmd, opts = {}) -> new Promise (resolve, reject) ->
    log (cmd)
    exec cmd, opts, (err, stdout, stderr) ->
        if stdout then return resolve(stdout)
        if stderr then return reject({message: stderr})
        if err then return reject(err)
