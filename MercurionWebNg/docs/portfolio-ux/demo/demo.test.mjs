import assert from 'node:assert/strict'
import test from 'node:test'
import { loadDataset, validateDataset } from './validate.mjs'
import { openDemoPreview } from './preview.mjs'

test('the public source snapshot and demo references are internally consistent', () => {
  validateDataset(...loadDataset())
})

for (const [name, change] of [
  ['a renamed chemical source', (_, sources) => { sources[0].record.pref_name = 'PIPERIDINE' }],
  ['a different structure with the old source name', (_, sources) => { sources[0].record.canonical_smiles = 'C1CCNCC1' }],
  ['an independently copied structure on a demo item', data => { data.molecules[0].canonicalSmiles = 'C1CCNCC1' }],
  ['an invented inference', data => { data.molecules[0].t1Inference = { result: 'safe' } }],
  ['a dangling collection member', data => { data.collections[0].moleculeKeys.push('missing') }],
  ['duplicate molecule identities', data => { data.molecules[1].key = data.molecules[0].key }]
]) {
  test(`rejects ${name}`, () => {
    const [data, sources] = loadDataset()
    change(data, sources)
    assert.throws(() => validateDataset(data, sources))
  })
}

function transportHarness(origin = 'http://localhost:8888') {
  let handler
  let continued = 0
  const tab = {
    route: async (_, callback) => { handler = callback },
    goto: async () => { assert.ok(handler, 'Protection must be installed before navigation') }
  }
  const page = {
    url: () => `${origin}/contacts`,
    context: () => ({ newPage: async () => tab })
  }
  return {
    page,
    continued: () => continued,
    request: async (path, method = 'GET', body = {}) => {
      let response
      await handler({
        request: () => ({
          url: () => `http://localhost:8888${path}`,
          method: () => method,
          postDataJSON: () => body
        }),
        fulfill: async value => { response = value },
        continue: async () => { continued++ }
      })
      return response
    }
  }
}

test('refuses non-development origins before creating a tab', async () => {
  await assert.rejects(openDemoPreview(transportHarness('https://example.test').page, ...loadDataset()))
})

test('blocks writes, batches, spoofed query names and unsupported operations without forwarding', async () => {
  const harness = transportHarness()
  await openDemoPreview(harness.page, ...loadDataset())
  for (const [path, method, body] of [
    ['/api/history', 'DELETE'],
    ['/api/notifications/read-all', 'PATCH'],
    ['/api/account/change-phone', 'POST'],
    ['/api/graphql', 'POST', { operationName: 'PaginatedCollections', query: 'mutation PaginatedCollections { deleteMoleculeItem(id: "x") }' }],
    ['/api/graphql', 'POST', [{ operationName: 'CreateMoleculeItem' }]],
    ['/api/graphql', 'POST', { operationName: 'CreateMoleculeItem', query: 'mutation CreateMoleculeItem { x }' }],
    ['/api/graphql', 'POST', { operationName: 'UnknownQuery', query: 'query UnknownQuery { x }' }]
  ]) {
    assert.equal((await harness.request(path, method, body)).status, 403, `${method} ${path}`)
  }
  assert.equal(harness.continued(), 0)
})

test('serves only local fixtures and leaves source structures unchanged', async () => {
  const harness = transportHarness()
  const preview = await openDemoPreview(harness.page, ...loadDataset())
  const page = await harness.request('/api/graphql', 'POST', {
    operationName: 'PaginatedCollections', query: 'query PaginatedCollections { x }',
    variables: { page: 1, limit: 2, q: 'Demo25' }
  })
  assert.equal(page.json.data.myMoleculeCollectionsPaginated.items.length, 2)
  assert.equal(page.json.data.myMoleculeCollectionsPaginated.totalItems, 3)
  assert.equal(preview.items[0].chemblDetails.canonicalSmiles, preview.items[3].canonicalSmiles)
  assert.equal(preview.items[3].propertiesJson, null)
  assert.equal((await harness.request('/api/history')).json.items.length, 0)
  assert.equal((await harness.request('/api/notifications?state=unread')).json.items.length, 1)
  assert.equal(harness.continued(), 0)
})
