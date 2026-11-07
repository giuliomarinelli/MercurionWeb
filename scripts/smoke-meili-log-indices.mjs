// Isolated Meilisearch write/read check; no host ports, existing services or volumes.
import { execFileSync, spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

const image = 'getmeili/meilisearch@sha256:8cd411ba5d9ec2dfce02e241305208eebacce0fd74a72bece21cadd03dc566ce'
const nodeImage = 'node:22.23.4-alpine3.24@sha256:0e1754758c2df4cfa3e68d59e2e1b7374bb7fd9ea6328eaaacf15cc934af8202'
const name = `meili-log-qa-${randomUUID().slice(0, 8)}`
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', timeout: 120_000 }).trim()
const key = 'synthetic-meili-log-qa-only'
const probe = `
const assert = require('node:assert/strict')
const { MeiliSearch } = require('/qa/meilisearch.cjs')
const client = new MeiliSearch({host:'http://meili:7700',apiKey:process.env.QA_MEILI_KEY})
async function main() {
  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    try { await client.health(); ready = true; break } catch { await new Promise(r=>setTimeout(r,500)) }
  }
  assert(ready, 'Owned Meilisearch did not become ready')
  assert.equal((await client.getRawIndexes()).results.length,0)
  const expected = []
  for (const environment of ['development','test','staging','production']) {
    for (const kind of ['logs','security_logs']) {
      const indexName = kind+'_'+environment
      const index = client.index(indexName)
      const document = {id:'same-synthetic-event',environment,kind,revision:1}
      // Same SDK call/options as the outbox consumer; no explicit createIndex.
      const task = await index.addDocuments([document],{primaryKey:'id'})
      assert.equal((await client.tasks.waitForTask(task)).status,'succeeded')
      assert.equal((await client.getRawIndex(indexName)).primaryKey,'id')
      assert.deepEqual(await index.getDocument(document.id),document)
      const replay = await index.addDocuments([{...document,revision:2}],{primaryKey:'id'})
      assert.equal((await client.tasks.waitForTask(replay)).status,'succeeded')
      expected.push(indexName)
    }
  }
  assert.deepEqual((await client.getRawIndexes()).results.map(i=>i.uid).sort(),expected.sort())
  for (const indexName of expected) {
    const documents = await client.index(indexName).getDocuments()
    assert.equal(documents.results.length,1)
    const document = documents.results[0]
    assert.equal(indexName,document.kind+'_'+document.environment)
    assert.equal(document.revision,2)
  }
  console.log(JSON.stringify({status:'passed',indexes:expected,primaryKey:'id',
    creation:'implicit-on-first-write',replay:'same-id-replaced',isolation:'passed'}))
}
main().catch(error=>{console.error(error);process.exitCode=1})
`
let network = false
let worker = false
try {
  docker('network', 'create', '--internal', name)
  network = true
  docker('run', '-d', '--name', name, '--network', name, '--network-alias', 'meili',
    '--env', `MEILI_MASTER_KEY=${key}`, '--env', 'MEILI_NO_ANALYTICS=true',
    '--tmpfs', '/meili_data:rw,size=128m', image)
  worker = true
  const result = spawnSync('docker', ['run', '--rm', '-i', '--network', name,
    '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
    '--mount', `type=bind,src=${resolve('node_modules/meilisearch/dist/umd/index.min.js')},dst=/qa/meilisearch.cjs,readonly`,
    '--env', `QA_MEILI_KEY=${key}`, nodeImage, 'node', '-'],
  { input: probe, encoding: 'utf8', timeout: 90_000 })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`Meilisearch probe failed: ${result.stderr}`)
  process.stdout.write(result.stdout)
} finally {
  if (worker) docker('rm', '--force', name)
  if (network) docker('network', 'rm', name)
}
