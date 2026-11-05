const path = require('node:path')
const load = file => require(path.join(__dirname, 'runtime/src', file))
const logger = { forContext: () => new Proxy({}, { get: () => () => undefined }) }
const userId = '11111111-1111-4111-8111-111111111111'
const deviceId = 'synthetic-device'
const writerPaths = { currentDirectory: '/registry/writer-current', historyDirectory: '/registry/writer-history' }
const readerPaths = { currentDirectory: '/registry/reader-current', historyDirectory: '/registry/reader-history' }
const { Environment } = load('config/config.schema.js')
const { TokenType } = load('app_modules/auth/models/enums/token-type.enum.js')

function respond(handler) {
  process.on('message', async message => {
    if (!message.requestId) return
    try { process.send({ responseId: message.requestId, value: await handler(message.action, message.data) }) }
    catch (error) { process.send({ responseId: message.requestId, error: error.code || error.name || 'QA_ERROR', frames: error.stack?.split('\n').slice(1, 4) }) }
  })
}
module.exports = { load, logger, userId, deviceId, writerPaths, readerPaths, Environment, TokenType, respond }
