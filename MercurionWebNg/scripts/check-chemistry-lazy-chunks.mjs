import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceRoot = fileURLToPath(new URL('../src/app/', import.meta.url))
const browserOutput = new URL('../dist/mercurion-web-ng/browser/', import.meta.url)

async function collectTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return collectTypeScriptFiles(path)
    return entry.name.endsWith('.ts') ? [path] : []
  }))
  return nested.flat()
}

const sourceFiles = await collectTypeScriptFiles(sourceRoot)
const consumerFiles = sourceFiles.filter(path =>
  !path.endsWith('.spec.ts') &&
  (path.includes(`${join('components', '')}`) || path.includes(`${join('pages', '')}`))
)

for (const path of consumerFiles) {
  const source = await readFile(path, 'utf8')
  if (source.includes("from '@rdkit/rdkit'") || source.includes('ketcherReady')) {
    throw new Error(`Chemistry vendor API leaked into feature consumer: ${path}`)
  }
}

const rendererLoader = await readFile(new URL('../src/app/chemistry/chemistry-renderer.service.ts', import.meta.url), 'utf8')
const editorLoader = await readFile(new URL('../src/app/chemistry/chemistry-editor.service.ts', import.meta.url), 'utf8')
if (!rendererLoader.includes("import('./adapters/rdkit-renderer.adapter')")) {
  throw new Error('RDKit adapter is not loaded through a dynamic import.')
}
if (!editorLoader.includes("import('./adapters/ketcher-editor.adapter')")) {
  throw new Error('Ketcher adapter is not loaded through a dynamic import.')
}

const JavaScriptFiles = (await readdir(browserOutput))
  .filter(name => name.endsWith('.js'))
const mainName = JavaScriptFiles.find(name => name.startsWith('main-'))
if (!mainName) throw new Error('Angular main entry chunk was not found.')

const mainSource = await readFile(new URL(mainName, browserOutput), 'utf8')
const signatures = ['get_svg_with_highlights', 'ketcherReady']
for (const signature of signatures) {
  if (mainSource.includes(signature)) {
    throw new Error(`Chemistry vendor signature "${signature}" leaked into ${mainName}.`)
  }
}

const lazySources = await Promise.all(
  JavaScriptFiles
    .filter(name => name !== mainName)
    .map(async name => ({ name, source: await readFile(new URL(name, browserOutput), 'utf8') }))
)

for (const signature of signatures) {
  if (!lazySources.some(chunk => chunk.source.includes(signature))) {
    throw new Error(`Expected chemistry lazy chunk signature "${signature}" was not emitted.`)
  }
}

console.log(`Chemistry lazy-boundary check passed: ${mainName} excludes RDKit and Ketcher adapter signatures.`)
