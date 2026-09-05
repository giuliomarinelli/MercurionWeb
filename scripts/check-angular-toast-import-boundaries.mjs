import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const angularAppRoot = path.join(repositoryRoot, 'MercurionWebNg', 'src', 'app')
const toastServicePath = path.join(angularAppRoot, 'services', 'toast.service.ts')
const toastComponentPath = path.join(
  angularAppRoot,
  'components',
  'common',
  'toast',
  'toast.component.ts'
)
const toastModelPath = path.join(angularAppRoot, 'Models', 'toast.models.ts')

export function collectRelativeImportSpecifiers(filePath, sourceText) {
  const source = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true)
  const imports = []

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier) &&
      node.moduleSpecifier.text.startsWith('.')
    ) {
      imports.push(node.moduleSpecifier.text)
    }
    ts.forEachChild(node, visit)
  }

  visit(source)
  return imports
}

export function findDependencyPath(graph, start, target) {
  const queue = [[start]]
  const visited = new Set()

  while (queue.length > 0) {
    const currentPath = queue.shift()
    const current = currentPath.at(-1)
    if (current === target) return currentPath
    if (visited.has(current)) continue
    visited.add(current)

    for (const dependency of graph.get(current) ?? []) {
      queue.push([...currentPath, dependency])
    }
  }

  return undefined
}

function walkProductionTypeScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return walkProductionTypeScriptFiles(fullPath)
    if (
      entry.isFile() &&
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.spec.ts') &&
      !entry.name.endsWith('.test.ts')
    ) {
      return [fullPath]
    }
    return []
  })
}

function resolveRelativeImport(importer, moduleSpecifier) {
  const unresolvedPath = path.resolve(path.dirname(importer), moduleSpecifier)
  const candidates = [
    unresolvedPath,
    `${unresolvedPath}.ts`,
    path.join(unresolvedPath, 'index.ts')
  ]
  return candidates.find((candidate) => fs.existsSync(candidate))
}

function createDependencyGraph() {
  const graph = new Map()

  for (const filePath of walkProductionTypeScriptFiles(angularAppRoot)) {
    const dependencies = collectRelativeImportSpecifiers(
      filePath,
      fs.readFileSync(filePath, 'utf8')
    )
      .map((moduleSpecifier) => resolveRelativeImport(filePath, moduleSpecifier))
      .filter(Boolean)
    graph.set(filePath, dependencies)
  }

  return graph
}

function displayPath(filePath) {
  return path.relative(repositoryRoot, filePath)
}

export function checkAngularToastImportBoundaries() {
  const graph = createDependencyGraph()
  const violations = []
  const serviceDependencies = graph.get(toastServicePath) ?? []
  const componentDependency = serviceDependencies.find((dependency) =>
    dependency.startsWith(`${path.join(angularAppRoot, 'components')}${path.sep}`)
  )

  if (componentDependency) {
    violations.push(
      `${displayPath(toastServicePath)} imports component module ${displayPath(componentDependency)}`
    )
  }

  const cyclePath = findDependencyPath(graph, toastServicePath, toastComponentPath)
  if (cyclePath) {
    violations.push(
      `toast service reaches its renderer: ${cyclePath.map(displayPath).join(' -> ')}`
    )
  }

  const modelDependencies = graph.get(toastModelPath) ?? []
  if (modelDependencies.length > 0) {
    violations.push(
      `${displayPath(toastModelPath)} must remain neutral but imports ${modelDependencies
        .map(displayPath)
        .join(', ')}`
    )
  }

  if (violations.length > 0) {
    throw new Error(`Angular toast import boundary violations:\n${violations.join('\n')}`)
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  checkAngularToastImportBoundaries()
  console.log('Angular toast import boundary check passed.')
}
