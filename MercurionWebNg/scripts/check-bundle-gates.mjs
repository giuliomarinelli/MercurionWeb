import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const outputDirectory = join(root, 'dist', 'mercurion-web-ng')
const statsPath = join(outputDirectory, 'stats.json')
const reportPath = join(outputDirectory, 'bundle-gate-report.json')
const initialBudget = 1_000_000
const approvedCommonJs = new Set([
  '@mercurion/rest-contracts',
  '@rdkit/rdkit',
  'eventemitter3',
  'fast-diff',
  'lodash.clonedeep',
  'lodash.isequal',
  'quill-delta',
])

const stats = JSON.parse(await readFile(statsPath, 'utf8'))
const outputs = stats.outputs ?? {}
const entryFiles = Object.keys(outputs).filter((file) =>
  /^(main|polyfills)-.*\.js$/.test(file) || /^styles-.*\.css$/.test(file),
)

const initialFiles = new Set()
const pending = [...entryFiles]
while (pending.length > 0) {
  const file = pending.pop()
  if (initialFiles.has(file)) continue
  initialFiles.add(file)
  for (const imported of outputs[file]?.imports ?? []) {
    if (imported.kind === 'import-statement') pending.push(imported.path)
  }
}

const initialBytes = [...initialFiles].reduce(
  (total, file) => total + (outputs[file]?.bytes ?? 0),
  0,
)

const commonJsModules = Object.entries(stats.inputs ?? {})
  .filter(([, input]) => input.format === 'cjs' || input.format === 'commonjs')
  .map(([file]) => file)

const packageName = (file) => {
  if (file.startsWith('../packages/rest-contracts/')) return '@mercurion/rest-contracts'
  const segments = file.split('/node_modules/')
  const packagePath = segments.at(-1)?.split('/') ?? []
  if (packagePath[0]?.startsWith('@')) return `${packagePath[0]}/${packagePath[1]}`
  return packagePath[0] ?? file
}

const undocumentedCommonJs = commonJsModules
  .map((file) => ({ file, package: packageName(file) }))
  .filter(({ package: name }) => {
    return !approvedCommonJs.has(name)
  })

const report = {
  budgetBytes: initialBudget,
  initialBytes,
  initialFiles: [...initialFiles].sort(),
  commonJsModules,
  approvedCommonJs: [...approvedCommonJs].sort(),
  undocumentedCommonJs,
}
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)

console.log(`Angular initial bundle: ${initialBytes} bytes / ${initialBudget} bytes`)
console.log(`Angular CommonJS modules: ${commonJsModules.length}; report: ${reportPath}`)
if (initialBytes > initialBudget) {
  console.error(`Initial bundle exceeds the hard 1 MB budget by ${initialBytes - initialBudget} bytes`)
  process.exitCode = 1
}
if (undocumentedCommonJs.length > 0) {
  console.error('Undocumented CommonJS modules detected:')
  for (const module of undocumentedCommonJs) console.error(`- ${module.file}`)
  process.exitCode = 1
}
