import assert from 'node:assert/strict'
import { findSocketEventPolicyViolations } from './socket-event-policy.mjs'

const declaredEventNames = new Set(['so.pub.public_test'])

const undeclared = findSocketEventPolicyViolations({
  sourceText: "client.emit('so.pub.undeclared', 'payload')",
  fileName: 'undeclared.ts',
  declaredEventNames
})
assert.equal(undeclared.length, 1)
assert.equal(undeclared[0].reason, 'Socket.IO boundary uses an undeclared event name')

const duplicatedLiteral = findSocketEventPolicyViolations({
  sourceText: "@SubscribeMessage('so.pub.public_test')\nhandle() {}",
  fileName: 'duplicated.ts',
  declaredEventNames
})
assert.equal(duplicatedLiteral.length, 1)
assert.equal(
  duplicatedLiteral[0].reason,
  'declared event names must be referenced through socketEventRegistry'
)

const registryReference = findSocketEventPolicyViolations({
  sourceText: 'client.emit(socketEventRegistry.publicTestRequest.name, "payload")',
  fileName: 'registry-reference.ts',
  declaredEventNames
})
assert.equal(registryReference.length, 0)

console.log('Socket.IO event policy negative tests passed.')
