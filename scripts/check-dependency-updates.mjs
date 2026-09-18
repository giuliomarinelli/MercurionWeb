import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

const root = resolve(import.meta.dirname, '..')
const expected = [
  ['npm', '/'],
  ['npm', '/MercurionData'],
  ['npm', '/MercurionLandingFactory'],
  ['docker', '/MercurionWebNg'],
  ['docker', '/MercurionWebNode'],
  ['github-actions', '/']
]

export function validate(config, policy) {
  const errors = []
  const blocks = config.split(/\n(?=  - package-ecosystem:)/).slice(1)
  const keys = []
  for (const block of blocks) {
    const ecosystem = block.match(/package-ecosystem:\s*([^\s]+)/)?.[1]
    const directory = block.match(/\n\s+directory:\s*([^\s]+)/)?.[1]
    const key = `${ecosystem}:${directory}`
    keys.push(key)
    if (!/\n\s+target-branch:\s*develop\s*(?:\n|$)/.test(block)) errors.push(`${key}: invalid target branch`)
    if (!/\n\s+reviewers:\s*\[[^\]]+\]/.test(block)) errors.push(`${key}: missing owner`)
    if (/\n\s+ignore:/.test(block)) errors.push(`${key}: inline ignore is forbidden`)
    if (/patterns:\s*\["\*"\]/.test(block)) errors.push(`${key}: over-broad group`)
  }
  for (const [ecosystem, directory] of expected) {
    const key = `${ecosystem}:${directory}`
    const count = keys.filter(value => value === key).length
    if (count !== 1) errors.push(`${key}: expected exactly one manager, found ${count}`)
  }
  if (config.includes('renovate')) errors.push('multiple update automations configured')
  if (policy.automation !== 'dependabot' || !policy.owner) errors.push('missing automation owner')
  if (policy.targetBranch !== 'develop' || policy.autoMerge !== false) errors.push('unsafe integration policy')
  for (const severity of ['critical', 'high', 'moderate', 'low']) {
    const hours = policy.securityUpdateWindowsHours?.[severity]
    if (!Number.isInteger(hours) || hours <= 0) errors.push(`missing finite ${severity} security window`)
  }
  return errors
}

if (process.argv.includes('--self-test')) {
  const policy = { automation: 'dependabot', owner: 'x', targetBranch: 'develop', autoMerge: false, securityUpdateWindowsHours: { critical: 1, high: 2, moderate: 3, low: 4 } }
  const base = expected.map(([ecosystem, directory]) => `  - package-ecosystem: ${ecosystem}\n    directory: ${directory}\n    target-branch: develop\n    reviewers: [x]`).join('\n')
  const assertFails = (text, message) => { if (validate(`version: 2\nupdates:\n${text}`, policy).length === 0) throw new Error(message) }
  assertFails(base.replace('    reviewers: [x]', ''), 'missing owner fixture must fail')
  assertFails(`${base}\n${base.split('\n').slice(0, 4).join('\n')}`, 'duplicate manager fixture must fail')
  assertFails(base.replace('    target-branch: develop', '    target-branch: master'), 'invalid branch fixture must fail')
  assertFails(base.replace('    reviewers: [x]', '    reviewers: [x]\n    groups:\n      all:\n        patterns: ["*"]'), 'broad group fixture must fail')
  assertFails(base.replace('    reviewers: [x]', '    reviewers: [x]\n    ignore:\n      - dependency-name: x'), 'ignore fixture must fail')
  console.log('Dependency-update negative fixtures passed.')
} else {
  const config = await readFile(resolve(root, '.github/dependabot.yml'), 'utf8')
  const policy = JSON.parse(await readFile(resolve(root, 'docs/dependency-update-policy.json'), 'utf8'))
  const errors = validate(config, policy)
  if (errors.length) throw new Error(errors.join('\n'))
  console.log(`Dependency-update policy covers ${expected.length} ecosystem roots.`)
}
