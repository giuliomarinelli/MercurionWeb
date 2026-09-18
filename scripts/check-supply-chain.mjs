import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

const root = resolve(import.meta.dirname, '..')
const reportDirectory = resolve(root, 'reports/supply-chain')
const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const sha256 = value => createHash('sha256').update(value).digest('hex')

export function validatePolicy(policy, now = new Date()) {
  const errors = []
  if (policy.version !== 1) errors.push('unsupported policy version')
  if (!Array.isArray(policy.owners) || policy.owners.length === 0) errors.push('missing policy owner')
  for (const exception of policy.exceptions ?? []) {
    for (const field of ['finding', 'owner', 'reason', 'compensatingControl', 'expires']) {
      if (!exception[field]) errors.push(`exception missing ${field}`)
    }
    if (exception.finding === '*' || exception.package === '*') errors.push('over-broad exception')
    if (exception.expires && new Date(exception.expires) <= now) errors.push(`expired exception ${exception.finding}`)
  }
  return errors
}

export function scanText(path, contents) {
  const rules = [
    ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ['github-token', /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/],
    ['aws-access-key', /\bAKIA[0-9A-Z]{16}\b/],
    ['npm-token', /\bnpm_[A-Za-z0-9]{30,}\b/]
  ]
  return contents.split(/\r?\n/).flatMap((line, index) => rules
    .filter(([, pattern]) => pattern.test(line))
    .map(([rule]) => ({ path, line: index + 1, rule })))
}

export function validateActionReferences(workflow) {
  return [...workflow.matchAll(/^\s*(?:-\s*)?uses:\s*([^\s#]+)\s*$/gm)]
    .map(match => match[1])
    .filter(reference => !reference.startsWith('./') && !/@[0-9a-f]{40}$/.test(reference))
}

function auditDependencies() {
  let output
  try {
    const executable = process.platform === 'win32' ? 'cmd.exe' : 'npm'
    const args = process.platform === 'win32'
      ? ['/d', '/s', '/c', 'npm audit --json --omit=dev']
      : ['audit', '--json', '--omit=dev']
    output = execFileSync(executable, args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  } catch (error) {
    output = error.stdout
    if (!output) throw new Error('dependency vulnerability scanner unavailable')
  }
  const audit = JSON.parse(output)
  if (!audit.metadata?.vulnerabilities) throw new Error('dependency vulnerability result is malformed')
  return audit
}

async function main() {
  const policy = await readJson(resolve(root, 'docs/supply-chain-policy.json'))
  const policyErrors = validatePolicy(policy)
  if (policyErrors.length) throw new Error(policyErrors.join('\n'))
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0').filter(Boolean)
  const findings = []
  for (const path of tracked) {
    if (path.startsWith('scripts/fixtures/supply-chain/')) continue
    let contents
    try { contents = await readFile(resolve(root, path), 'utf8') } catch { continue }
    if (!contents.includes('\0')) findings.push(...scanText(path, contents))
  }
  if (findings.length) throw new Error(`secret scan failed (values redacted):\n${findings.map(f => `${f.path}:${f.line} ${f.rule}`).join('\n')}`)
  const mutableActions = []
  for (const path of tracked.filter(path => /^\.github\/workflows\/.*\.ya?ml$/.test(path))) {
    const contents = await readFile(resolve(root, path), 'utf8')
    mutableActions.push(...validateActionReferences(contents).map(reference => `${path}: ${reference}`))
  }
  if (mutableActions.length) throw new Error(`workflow actions must use immutable SHAs:\n${mutableActions.join('\n')}`)
  const lockText = await readFile(resolve(root, 'package-lock.json'), 'utf8')
  const lock = JSON.parse(lockText)
  const missingAllowed = new Set(policy.licenses.missingMetadataExceptions)
  const licenseErrors = []
  const components = []
  for (const [path, entry] of Object.entries(lock.packages ?? {})) {
    if (!path || !entry.version) continue
    if (!entry.license && !missingAllowed.has(path)) licenseErrors.push(`${path}: missing license metadata`)
    if (policy.licenses.denied.includes(entry.license)) licenseErrors.push(`${path}: denied license ${entry.license}`)
    components.push({ type: 'library', name: path.replace(/^node_modules\//, ''), version: entry.version, licenses: entry.license ? [{ license: { id: entry.license } }] : [] })
  }
  if (licenseErrors.length) throw new Error(`license policy failed:\n${licenseErrors.join('\n')}`)
  const audit = auditDependencies()
  const blocking = policy.vulnerabilities.blockingSeverities.filter(severity => (audit.metadata.vulnerabilities[severity] ?? 0) > 0)
  if (blocking.length) throw new Error(`blocking dependency vulnerabilities: ${blocking.join(', ')}`)
  const identity = await readJson(resolve(root, 'build/build-identity.json'))
  const lockDigest = sha256(lockText)
  const sbom = {
    bomFormat: 'CycloneDX', specVersion: '1.6', serialNumber: `urn:uuid:${lockDigest.slice(0, 8)}-${lockDigest.slice(8, 12)}-4${lockDigest.slice(13, 16)}-a${lockDigest.slice(17, 20)}-${lockDigest.slice(20, 32)}`, version: 1,
    metadata: { component: { type: 'application', name: 'MercurionWeb', version: identity.version, properties: [
      { name: 'mercurion:revision', value: identity.revision }, { name: 'mercurion:lockfileSha256', value: lockDigest }
    ] } }, components
  }
  await mkdir(reportDirectory, { recursive: true })
  const sbomPath = resolve(reportDirectory, 'workspace.cyclonedx.json')
  await writeFile(sbomPath, `${JSON.stringify(sbom, null, 2)}\n`)
  const manifest = {
    schemaVersion: 1, version: identity.version, revision: identity.revision, lockfileSha256: lockDigest,
    sbom: { path: 'workspace.cyclonedx.json', sha256: sha256(await readFile(sbomPath)) },
    workspaces: ['MercurionWebNg', 'MercurionWebNode', 'packages/rest-contracts', 'packages/socket-contracts'],
    imageEvidence: 'reports/containers/nest-production', vulnerabilitySummary: audit.metadata.vulnerabilities,
    attestationIdentity: policy.attestation
  }
  await writeFile(resolve(reportDirectory, 'release-candidate.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(JSON.stringify({ components: components.length, vulnerabilities: audit.metadata.vulnerabilities }))
}

if (process.argv.includes('--self-test')) {
  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  assert(scanText('fixture', `token="${'ghp_'}${'123456789012345678901234567890123456'}"`).length >= 1, 'secret fixture must fail')
  assert(validateActionReferences('steps:\n  - uses: actions/checkout@v4').length === 1, 'mutable action fixture must fail')
  assert(validatePolicy({ version: 1, owners: ['x'], exceptions: [{ finding: '*', owner: 'x', reason: 'x', compensatingControl: 'x', expires: '2020-01-01' }] }).length === 2, 'invalid exception fixture must fail')
  console.log('Supply-chain negative fixtures passed.')
} else await main()
