import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const docs = [
  'readme.md',
  'MercurionWebNg/README.md',
  'MercurionWebNode/README.md',
  'MercurionData/README.md',
  'MercurionLandingFactory/README.md',
  'docs/configuration.md'
]
const forbidden = [
  'generated using [Angular CLI]',
  'Code scaffolding',
  'npm run e2e',
  'ng e2e',
  'Nest framework TypeScript starter repository',
  'Todo: stendere'
]
const errors = []
const command = /(?:npm run|npm test|npm install|npm ci)[ \t]+([a-zA-Z0-9:._-]+)(?:[ \t]+--workspace[ \t]+([a-zA-Z0-9_-]+))?/g
const rootManifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const workspaceManifests = new Map()
for (const workspace of rootManifest.workspaces) {
  const manifestPath = path.join(root, workspace, 'package.json')
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    workspaceManifests.set(manifest.name, manifestPath)
  }
}
const schema = fs.readFileSync(path.join(root, 'MercurionWebNode/src/config/config.schema.ts'), 'utf8')
const example = fs.readFileSync(path.join(root, 'MercurionWebNode/env/.env.example'), 'utf8')
const schemaSources = [...schema.matchAll(/(?:required|optional|defaulted)\('([A-Z][A-Z0-9_]+)'/g)].map(match => match[1])
const exampleSources = new Set([...example.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map(match => match[1]))
for (const source of schemaSources) {
  if (!exampleSources.has(source)) errors.push(`env.example: missing schema variable ${source}`)
}

for (const relative of docs) {
  const file = path.join(root, relative)
  if (!fs.existsSync(file)) {
    errors.push(`${relative}: missing documentation file`)
    continue
  }
  const text = fs.readFileSync(file, 'utf8')
  for (const marker of forbidden) if (text.includes(marker)) errors.push(`${relative}: forbidden scaffold marker ${marker}`)
  const link = /\[[^\]]+\]\(([^)#]+)(?:#[^)]+)?\)/g
  let match
  while ((match = link.exec(text))) {
    const target = match[1]
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(target) || target.startsWith('mailto:')) continue
    if (!fs.existsSync(path.resolve(root, path.dirname(relative), target))) errors.push(`${relative}: broken relative link ${target}`)
  }
  const projectManifest = relative === 'MercurionWebNg/README.md'
    ? path.join(root, 'MercurionWebNg/package.json')
    : relative === 'MercurionWebNode/README.md'
      ? path.join(root, 'MercurionWebNode/package.json')
      : relative === 'MercurionData/README.md'
        ? path.join(root, 'MercurionData/package.json')
        : relative === 'MercurionLandingFactory/README.md'
          ? path.join(root, 'MercurionLandingFactory/package.json')
          : path.join(root, 'package.json')
  let commandMatch
  while ((commandMatch = command.exec(text))) {
    const [, script, workspace] = commandMatch
    if (script === 'install' || script === 'ci') continue
    const manifest = workspace ? workspaceManifests.get(workspace) : path.join(root, 'package.json')
    const candidates = workspace
      ? [manifest]
      : [projectManifest, path.join(root, 'package.json')]
    if (!candidates.some(candidate => candidate && fs.existsSync(candidate))) {
      errors.push(`${relative}: command references missing workspace ${workspace}`)
      continue
    }
    const exists = candidates.some(candidate => {
      if (!candidate || !fs.existsSync(candidate)) return false
      return Boolean(JSON.parse(fs.readFileSync(candidate, 'utf8')).scripts?.[script])
    })
    if (!exists) errors.push(`${relative}: command script not found: ${script}${workspace ? ` (${workspace})` : ''}`)
  }
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`Documentation checks passed for ${docs.length} canonical files.`)
