import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

const root = resolve(import.meta.dirname, '..')
const reportDirectory = resolve(root, 'reports/supply-chain')
const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const sha256 = value => createHash('sha256').update(value).digest('hex')
const severities = ['info', 'low', 'moderate', 'high', 'critical']

export function validatePolicy(policy, now = new Date()) {
  const errors = []
  if (policy.version !== 2) errors.push('unsupported policy version')
  if (JSON.stringify(policy.vulnerabilities?.blockingSeverities) !== JSON.stringify(severities) ||
      policy.vulnerabilities?.includeDevelopment !== true || policy.vulnerabilities?.lockfiles !== 'all-tracked') {
    errors.push('strict policy must block every severity across all tracked lockfiles, including development')
  }
  if (!Array.isArray(policy.exceptions) || policy.exceptions.length) errors.push('strict vulnerability policy permits no exceptions')
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

export function auditDependencies(directory = root, invoke = execFileSync) {
  let output
  try {
    const executable = process.platform === 'win32' ? 'cmd.exe' : 'npm'
    const args = process.platform === 'win32'
      ? ['/d', '/s', '/c', 'npm audit --json --include=dev --include=optional --include=peer']
      : ['audit', '--json', '--include=dev', '--include=optional', '--include=peer']
    output = invoke(executable, args, { cwd: directory, encoding: 'utf8', timeout: 120000, maxBuffer: 32 * 1024 * 1024 })
  } catch (error) {
    output = error.stdout
    if (error.status !== 1 || !output) throw new Error('dependency vulnerability scanner unavailable')
  }
  const audit = JSON.parse(output)
  validateAudit(audit)
  return audit
}

export function validateAudit(audit) {
  const counts = audit.metadata?.vulnerabilities
  if (audit.error || audit.auditReportVersion !== 2 || !counts || !audit.vulnerabilities ||
      typeof audit.vulnerabilities !== 'object' || Array.isArray(audit.vulnerabilities) ||
      Object.keys(counts).some(key => ![...severities, 'total'].includes(key)) ||
      [...severities, 'total'].some(key => !Number.isSafeInteger(counts[key]) || counts[key] < 0) ||
      severities.reduce((sum, key) => sum + counts[key], 0) !== counts.total) {
    throw new Error('dependency vulnerability result is malformed or unavailable')
  }
  const actual = Object.fromEntries(severities.map(severity => [severity, 0]))
  for (const item of Object.values(audit.vulnerabilities)) {
    if (!item || !severities.includes(item.severity)) throw new Error('unknown vulnerability severity')
    actual[item.severity]++
  }
  if (severities.some(severity => actual[severity] !== counts[severity])) throw new Error('inconsistent vulnerability counts')
  return { eligible: counts.total === 0, counts }
}

export function auditLockfiles(tracked, invoke = auditDependencies) {
  const locks = tracked.filter(path => path === 'package-lock.json' || path.endsWith('/package-lock.json')).sort()
  if (!locks.includes('package-lock.json')) throw new Error('root lockfile missing from audit inventory')
  return locks.map(lockfile => {
    const directory = resolve(root, lockfile.slice(0, -'package-lock.json'.length))
    return { lockfile, audit: invoke(directory) }
  })
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
  const audits = auditLockfiles(tracked)
  await mkdir(reportDirectory, { recursive: true })
  await writeFile(resolve(reportDirectory, 'dependency-audits.json'), `${JSON.stringify(audits, null, 2)}\n`)
  const blocking = audits.filter(({ audit }) => !validateAudit(audit).eligible)
  if (blocking.length) {
    throw new Error(`strict dependency policy rejected: ${blocking.map(({ lockfile, audit }) =>
      `${lockfile}: ${JSON.stringify(audit.metadata.vulnerabilities)}`).join('; ')}`)
  }
  const audit = audits.find(item => item.lockfile === 'package-lock.json').audit
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
    auditedLockfiles: audits.map(({ lockfile }) => lockfile),
    attestationIdentity: policy.attestation
  }
  await writeFile(resolve(reportDirectory, 'release-candidate.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(JSON.stringify({ components: components.length, vulnerabilities: audit.metadata.vulnerabilities }))
}

if (process.argv.includes('--self-test')) {
  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  assert(scanText('fixture', `token="${'ghp_'}${'123456789012345678901234567890123456'}"`).length >= 1, 'secret fixture must fail')
  assert(validateActionReferences('steps:\n  - uses: actions/checkout@v4').length === 1, 'mutable action fixture must fail')
  const validPolicy = { version: 2, owners: ['x'], exceptions: [], vulnerabilities: {
    blockingSeverities: severities, includeDevelopment: true, lockfiles: 'all-tracked'
  } }
  assert(validatePolicy(validPolicy).length === 0, 'strict policy must validate')
  for (const severity of severities) {
    assert(validatePolicy({ ...validPolicy, vulnerabilities: { ...validPolicy.vulnerabilities,
      blockingSeverities: severities.filter(item => item !== severity) } }).length > 0, 'severity removal must fail')
    const audit = { auditReportVersion: 2, metadata: { vulnerabilities: {
      ...Object.fromEntries(severities.map(item => [item, item === severity ? 1 : 0])), total: 1
    } }, vulnerabilities: { fixture: { severity } } }
    assert(!validateAudit(audit).eligible, `${severity} must block`)
  }
  const clean = { auditReportVersion: 2, metadata: { vulnerabilities: {
    ...Object.fromEntries(severities.map(item => [item, 0])), total: 0
  } }, vulnerabilities: {} }
  assert(validateAudit(clean).eligible, 'clean report must pass')
  for (const invalid of [{}, { ...clean, error: { code: 'registry-unavailable' } },
    { ...clean, vulnerabilities: { hidden: { severity: 'low' } } },
    { ...clean, metadata: { vulnerabilities: { ...clean.metadata.vulnerabilities, total: -1 } } },
    { ...clean, vulnerabilities: { fixture: { severity: 'NEW-SEVERITY' } } }]) {
    let rejected = false
    try { validateAudit(invalid) } catch { rejected = true }
    assert(rejected, 'malformed or inconsistent scanner output must fail')
  }
  let invocation
  auditDependencies(root, (...args) => { invocation = args; return JSON.stringify(clean) })
  assert(invocation[1].join(' ').includes('--include=dev') && !invocation[1].join(' ').includes('--omit'), 'development must be scanned')
  let scannerFailed = false
  try { auditDependencies(root, () => { throw { status: 2, stdout: JSON.stringify(clean) } }) } catch { scannerFailed = true }
  assert(scannerFailed, 'scanner error exit cannot approve a clean-looking payload')
  const seen = []
  const allLocks = auditLockfiles(['package-lock.json', 'MercurionData/package-lock.json',
    'MercurionLandingFactory/package-lock.json', 'README.md'], directory => { seen.push(directory); return clean })
  assert(allLocks.length === 3 && seen.length === 3, 'every tracked independent lockfile must be scanned')
  assert(validatePolicy({ ...validPolicy, exceptions: [{ finding: 'CVE-fixture', owner: 'x', reason: 'x', compensatingControl: 'x', expires: '2099-01-01' }] }).length > 0, 'exceptions must fail')
  console.log('Supply-chain negative fixtures passed.')
} else await main()
