import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'

const html = readFileSync(new URL('../MercurionWebNg/public/ketcher/index.html', import.meta.url), 'utf8')
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(match => match[1].includes('function exportCurrent'))?.[1]
assert.ok(script, 'Missing production bridge')
const microtasks = async () => { for (let i = 0; i < 20; i++) await Promise.resolve() }

function bridge({ read = () => '', convert = async ({ struct }) => ({ struct }), setMolecule = async () => {},
  structure = { atoms: new Map(), bonds: new Map() } } = {}) {
  const replies = [], handlers = {}
  let change
  const parent = { postMessage: message => replies.push(message) }
  const window = { parent, top: parent, self: {}, addEventListener: (event, handler) => { handlers[event] = handler },
    ketcher: { getKet: () => Promise.resolve(read()), setMolecule, structService: { convert }, editor: {
      struct: () => structure, subscribe: (_, listener) => { change = listener; return {} }, unsubscribe() {}
    } } }
  const context = vm.createContext({ window, location: { origin: 'http://localhost:8888' },
    matchMedia: () => ({ matches: false }), setTimeout, clearTimeout })
  vm.runInContext(script, context)
  return {
    replies, change: () => change(),
    send: (type, requestId, payload = '') => handlers.message({ source: parent, origin: 'http://localhost:8888', data: { type, requestId, sessionId: 'session', payload } }),
    drain: () => vm.runInContext('operationQueue', context), message: handlers.message,
    convert: struct => window.ketcher.structService.convert({ struct })
  }
}

test('changes during export coalesce to the latest immutable snapshot with one conversion active', async () => {
  let release, calls = 0, current = 'CC'
  const b = bridge({ read: () => current, convert: ({ struct }) => ++calls === 1
    ? new Promise(resolve => { release = () => resolve({ struct }) }) : Promise.resolve({ struct }) })
  b.send('getSmiles', 1); await microtasks()
  for (let i = 0; i < 50; i++) { current = 'C' + i; b.change() }
  assert.equal(calls, 1, 'change events must not start overlapping worker conversions')
  release(); await b.drain()
  const results = b.replies.filter(m => m.type === 'smiles')
  assert.equal(results.length, 1)
  assert.equal(results[0].payload, 'C49')
  assert.equal(results[0].requestId, 1)
  assert.equal(calls, 2, 'intermediate revisions are never converted')
})

test('failed exports return a correlated error and can retry the identical snapshot', async () => {
  let fail = true
  const b = bridge({ read: () => 'CC', convert: async ({ struct }) => {
    if (fail) throw new Error('invalid')
    return { struct }
  } })
  b.send('getSmiles', 1); await b.drain()
  assert.equal(b.replies.at(-1).type, 'smilesError')
  assert.equal(b.replies.at(-1).requestId, 1)
  assert.equal(b.replies.at(-1).payload, undefined)
  fail = false; b.send('getSmiles', 2); await b.drain()
  assert.equal(b.replies.at(-1).payload, 'CC')
})

test('reconciliation observes programmatic changes and reuses unchanged conversions', async () => {
  let current = 'CC', calls = 0
  const b = bridge({ read: () => current, convert: async ({ struct }) => { calls++; return { struct } } })
  b.send('getSmiles', 1); await b.drain()
  b.send('getSmiles', 2); await b.drain()
  assert.equal(calls, 1)
  current = ''; b.send('getSmiles', 3); await b.drain()
  assert.equal(b.replies.at(-1).payload, '')
  current = 'CC'; b.send('getSmiles', 4); await b.drain()
  assert.equal(b.replies.at(-1).payload, 'CC')
})

test('exports wait for setMolecule and foreign messages never execute', async () => {
  let release, calls = 0
  const b = bridge({ read: () => 'CCC', convert: async ({ struct }) => { calls++; return { struct } },
    setMolecule: () => new Promise(resolve => { release = resolve }) })
  b.message({ source: {}, origin: 'http://foreign.test', data: { type: 'getSmiles', sessionId: 'session', requestId: 99 } })
  b.send('setMolecule', 1, 'CCC'); b.send('getSmiles', 2)
  await microtasks(); assert.equal(calls, 0)
  release(); await b.drain()
  assert.equal(calls, 1)
  assert.equal(b.replies.at(-1).payload, 'CCC')
})

test('floating template previews never become the exported drawing or a change notification', async () => {
  const structure = { atoms: new Map(), bonds: new Map() }
  let current = '', calls = 0
  const b = bridge({ structure, read: () => current, convert: async ({ struct }) => { calls++; return { struct } } })
  b.send('getSmiles', 1); await b.drain()
  current = 'c1ccccc1'; structure.atoms.set(0, { isPreview: true })
  b.change()
  b.send('getSmiles', 2); await b.drain()
  b.send('getSmiles', 3); await b.drain()
  assert.equal(b.replies.at(-1).payload, '')
  assert.equal(calls, 1)
  assert.equal(b.replies.filter(m => m.type === 'structureChanged').length, 0)
})

test('commit is exported while a subsequent connected preview is still under the cursor', async () => {
  const structure = { atoms: new Map(), bonds: new Map() }
  let current = 'CC'
  const b = bridge({ structure, read: () => current })
  b.send('getSmiles', 1); await b.drain()
  current = 'CCC'; b.change()
  current = 'CCC.c1ccccc1'; structure.bonds.set(0, { isPreview: true })
  b.send('getSmiles', 2); await b.drain()
  assert.equal(b.replies.at(-1).payload, 'CCC')
  assert.equal(b.replies.filter(m => m.type === 'structureChanged').length, 1)
})

test('the service serializes concurrent callers against the bundled EE.once reply-loss behavior', async () => {
  let listeners = [], active = 0, maxActive = 0
  const b = bridge({ convert: ({ struct }) => new Promise(resolve => {
    active++; maxActive = Math.max(maxActive, active)
    listeners.push(message => { if (message.inputData === struct) resolve({ struct }) })
    queueMicrotask(() => {
      active--
      const once = listeners; listeners = []
      once.forEach(listener => listener({ inputData: struct }))
    })
  }) })
  const results = await Promise.all([b.convert('CC'), b.convert('CCC'), b.convert('CCCC')])
  assert.deepEqual(results.map(r => r.struct), ['CC', 'CCC', 'CCCC'])
  assert.equal(maxActive, 1)
})

test('a worker that never replies cannot poison subsequent exports or deliver its late result', async () => {
  let calls = 0, late, current = 'CC'
  const b = bridge({ read: () => current, convert: ({ struct }) => ++calls === 1
    ? new Promise(resolve => { late = () => resolve({ struct }) }) : Promise.resolve({ struct }) })
  b.send('getSmiles', 1); await b.drain()
  assert.equal(b.replies.at(-1).type, 'smilesError')
  current = 'CCC'; b.change(); b.send('getSmiles', 2); await b.drain()
  assert.equal(b.replies.at(-1).payload, 'CCC')
  late(); await microtasks()
  assert.equal(b.replies.filter(m => m.type === 'smiles').length, 1)
})

test('a snapshot that never resolves cannot block the command queue permanently', async () => {
  let fail = true
  const b = bridge({ read: () => fail ? new Promise(() => {}) : 'CCC' })
  b.send('getSmiles', 1); await b.drain()
  assert.equal(b.replies.at(-1).type, 'smilesError')
  fail = false; b.change(); b.send('getSmiles', 2); await b.drain()
  assert.equal(b.replies.at(-1).payload, 'CCC')
})

