import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { findSocketEventPolicyViolations } from './socket-event-policy.mjs'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = resolve(packageRoot, '..', '..')
const registryPath = join(packageRoot, 'src', 'index.ts')
const sourceRoots = [
  join(repositoryRoot, 'MercurionWebNg', 'src'),
  join(repositoryRoot, 'MercurionWebNode', 'src'),
  join(repositoryRoot, 'MercurionWebNode', 'test')
]

const collectTypeScriptFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return collectTypeScriptFiles(path)
    return entry.isFile() && path.endsWith('.ts') ? [path] : []
  }))
  return files.flat()
}

const collectDeclaredEventNames = (sourceText) => {
  const sourceFile = ts.createSourceFile(
    registryPath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  )
  const names = new Set()

  const visit = (node) => {
    if (
      ts.isPropertyAssignment(node) &&
      ((ts.isIdentifier(node.name) && node.name.text === 'name') ||
        (ts.isStringLiteralLike(node.name) && node.name.text === 'name')) &&
      ts.isStringLiteralLike(node.initializer)
    ) {
      names.add(node.initializer.text)
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return names
}

const declaredEventNames = collectDeclaredEventNames(await readFile(registryPath, 'utf8'))
const files = (await Promise.all(sourceRoots.map(collectTypeScriptFiles))).flat()
const violations = []
let checkedFiles = 0

for (const file of files) {
  const sourceText = await readFile(file, 'utf8')
  const isSocketAware =
    /from\s+['"]socket\.io(?:-client)?['"]/.test(sourceText) ||
    /from\s+['"][^'"]*realtime-socket\.service['"]/.test(sourceText)
  if (!isSocketAware) continue
  checkedFiles += 1
  violations.push(...findSocketEventPolicyViolations({
    sourceText,
    fileName: relative(repositoryRoot, file),
    declaredEventNames
  }))
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(
      `${violation.fileName}:${violation.line} ${violation.reason}: ${violation.eventName}`
    )
  }
  process.exitCode = 1
} else {
  console.log(
    `Socket.IO event policy passed: ${declaredEventNames.size} declared application events; ${checkedFiles} Socket.IO-aware files selected from ${files.length} TypeScript files.`
  )
}
