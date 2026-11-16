// Synthetic keys and documents only. Executed inside an owned, isolated container.
const assert = require('node:assert/strict')
const { MeiliSearch } = require('/qa/meilisearch.cjs')

const admin = new MeiliSearch({ host: 'http://meili:7700', apiKey: process.env.QA_MEILI_KEY })
let denied = 0
let writes = 0
let reads = 0
let phase = 'readiness'

async function completed(task) {
  assert.equal((await admin.tasks.waitForTask(task)).status, 'succeeded')
}

async function forbidden(operation) {
  // A timeout, unavailable service or asynchronous failed task is not an auth denial.
  await assert.rejects(operation, error => error.response?.status === 403 && error.cause?.code === 'invalid_api_key')
  denied++
}

async function keyClient(actions, indexes) {
  const { key } = await admin.createKey({ actions, indexes, expiresAt: null })
  return new MeiliSearch({ host: 'http://meili:7700', apiKey: key })
}

async function main() {
  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    try { await admin.health(); ready = true; break } catch { await new Promise(r => setTimeout(r, 500)) }
  }
  assert(ready, 'owned-server-not-ready')
  phase = 'seed'
  assert.equal((await admin.getRawIndexes()).results.length, 0)
  const molecular = ['molecule_previews_chembl_36', 'molecule_details_chembl_36']
  for (const uid of molecular) {
    phase = `seed-${uid}`
    await completed(await admin.index(uid).addDocuments([{ id: 'synthetic-molecule', label: uid }], { primaryKey: 'id' }))
  }
  const clients = {}
  for (const env of ['staging', 'production']) {
    phase = `consumer-permissions-${env}`
    const logs = [`logs_${env}`, `security_logs_${env}`]
    // VM contract: precreation belongs to the operator, not the runtime writer.
    for (const uid of logs) await completed(await admin.createIndex(uid, { primaryKey: 'id' }))
    const search = await keyClient(['search', 'documents.get'], molecular)
    const writer = await keyClient(['documents.add'], logs)
    clients[env] = { search, writer }
    for (const uid of molecular) {
      assert.equal((await search.index(uid).search('')).hits.length, 1)
      assert.equal((await search.index(uid).getDocument('synthetic-molecule')).label, uid)
      reads += 2
      await forbidden(() => search.index(uid).addDocuments([{ id: 'forbidden' }]))
      await forbidden(() => writer.index(uid).addDocuments([{ id: 'forbidden' }]))
      await forbidden(() => writer.index(uid).search(''))
    }
    for (const uid of logs) {
      for (const revision of [1, 2]) {
        await completed(await writer.index(uid).addDocuments([{ id: 'same-event', env, revision }], { primaryKey: 'id' }))
        writes++
      }
      const documents = await admin.index(uid).getDocuments()
      assert.deepEqual(documents.results, [{ id: 'same-event', env, revision: 2 }])
      await forbidden(() => search.index(uid).search(''))
      await forbidden(() => writer.index(uid).getDocument('same-event'))
      await forbidden(() => writer.index(uid).deleteDocument('same-event'))
    }
    for (const client of [search, writer]) {
      await forbidden(() => client.getKeys())
      await forbidden(() => client.createIndex(`unapproved_${env}`))
    }
  }
  for (const [env, other] of [['staging', 'production'], ['production', 'staging']]) {
    phase = `cross-environment-${env}`
    for (const uid of [`logs_${other}`, `security_logs_${other}`]) {
      await forbidden(() => clients[env].writer.index(uid).addDocuments([{ id: 'cross-environment' }]))
      await forbidden(() => clients[env].search.index(uid).search(''))
    }
  }
  assert.deepEqual((await admin.getRawIndexes()).results.map(i => i.uid).sort(), [
    ...molecular, 'logs_staging', 'security_logs_staging', 'logs_production', 'security_logs_production'
  ].sort())
  console.log(JSON.stringify({ status: 'passed', scope: 'isolated Meilisearch API authorization',
    environments: ['staging', 'production'], molecularReads: reads, logWrites: writes,
    explicit403Denials: denied, logCreation: 'operator-precreated', replay: 'same-id-replaced',
    nestRuntime: false, vmDeployment: false }))
}

main().catch(error => {
  console.error(JSON.stringify({ status: 'failed', phase, reads, writes, denied,
    errorType: error.name, code: error.code, httpStatus: error.response?.status,
    causeCode: error.cause?.code }))
  process.exitCode = 1
})
