import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const nestSourceRoot = path.join(repositoryRoot, 'MercurionWebNode', 'src')
const approvedInfrastructureRoot = path.join(nestSourceRoot, 'persistence')
const forbiddenPattern = /\.(?:transaction|createQueryRunner|startTransaction|commitTransaction|rollbackTransaction)\s*\(|\bqueryRunner\b/g

function walkTypeScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return walkTypeScriptFiles(fullPath)
    return entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')
      ? [fullPath]
      : []
  })
}

export function collectTransactionBoundaryViolations(filePath, sourceText) {
  return sourceText.split('\n').flatMap((sourceLine, index) => {
    const trimmed = sourceLine.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return []
    forbiddenPattern.lastIndex = 0
    return forbiddenPattern.test(sourceLine)
      ? [`${filePath}:${index + 1} owns a raw TypeORM transaction entrypoint; use the persistence UnitOfWork`]
      : []
  })
}

export function checkTransactionBoundaries() {
  const violations = walkTypeScriptFiles(nestSourceRoot)
    .filter((filePath) => !filePath.startsWith(approvedInfrastructureRoot + path.sep))
    .flatMap((filePath) => collectTransactionBoundaryViolations(
      path.relative(repositoryRoot, filePath),
      fs.readFileSync(filePath, 'utf8')
    ))

  if (violations.length > 0) {
    throw new Error(`TypeORM transaction boundary violations:\n${violations.join('\n')}`)
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkTransactionBoundaries()
  console.log('TypeORM transaction boundary policy passed.')
}
