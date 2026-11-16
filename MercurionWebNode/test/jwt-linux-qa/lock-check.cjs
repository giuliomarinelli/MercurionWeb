const fs = require('node:fs')
const before = JSON.parse(fs.readFileSync('/tmp/jwt-qa-lock.json', 'utf8'))
const after = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'))
// npm reclassifies install-location flags when reusing a Linux dependency image.
// Preserve versions, integrity, resolved URLs, dependency/peer edges and every other field.
const normalize = lock => ({ ...lock, packages: Object.fromEntries(Object.entries(lock.packages).map(([path, entry]) => {
  const { dev, devOptional, peer, ...dependency } = entry
  return [path, dependency]
})) })
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
if (JSON.stringify(canonical(normalize(before))) !== JSON.stringify(canonical(normalize(after)))) {
  const changed = [...new Set([...Object.keys(before.packages), ...Object.keys(after.packages)])]
    .filter(key => JSON.stringify(before.packages[key]) !== JSON.stringify(after.packages[key]))
  console.error(JSON.stringify({ error: 'LOCK_DRIFT', changes: changed.slice(0, 15).map(key => ({ path: key,
    before: before.packages[key]?.version, after: after.packages[key]?.version,
    fields: [...new Set([...Object.keys(before.packages[key] || {}), ...Object.keys(after.packages[key] || {})])]
      .filter(field => JSON.stringify(before.packages[key]?.[field]) !== JSON.stringify(after.packages[key]?.[field])) })), count: changed.length }))
  process.exitCode = 1
} else {
  fs.copyFileSync('/tmp/jwt-qa-lock.json', 'package-lock.json')
  console.log('QA lock versions, integrity and dependency edges preserved; install classification flags normalized')
}
