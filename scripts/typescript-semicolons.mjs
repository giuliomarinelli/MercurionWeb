import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

// Only punctuation tokens returned by the TypeScript parser are candidates.
// Comparing the complete syntax tree protects ASI-sensitive statement boundaries.
function parse(text, filename) {
  return ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true)
}

function shape(source) {
  const visit = node => {
    const children = []
    ts.forEachChild(node, child => { children.push(visit(child)) })
    return [node.kind, ts.isIdentifier(node) || ts.isPrivateIdentifier(node)
      ? String(node.escapedText)
      : ts.isLiteralExpression(node) || ts.isTemplateLiteralToken(node)
        ? node.getText(source)
        : null, children]
  }
  return JSON.stringify(visit(source))
}

function candidates(source) {
  const result = []
  const visit = node => {
    if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode) return
    if (node.kind === ts.SyntaxKind.SemicolonToken) {
      if (node.parent.kind !== ts.SyntaxKind.ForStatement &&
          node.parent.kind !== ts.SyntaxKind.EmptyStatement &&
          node.parent.kind !== ts.SyntaxKind.SemicolonClassElement) {
        result.push(node.getStart(source))
      }
      return
    }
    for (const child of node.getChildren(source)) visit(child)
  }
  visit(source)
  return result.sort((a, b) => b - a)
}

export function removeOptionalSemicolons(text, filename = 'input.ts') {
  const original = parse(text, filename)
  if (original.parseDiagnostics.length) throw new Error(`Invalid TypeScript: ${filename}`)
  const expected = shape(original)
  const positions = candidates(original)
  const equivalent = value => {
    const source = parse(value, filename)
    return !source.parseDiagnostics.length && shape(source) === expected
  }
  let output = text
  const allRemoved = positions.reduce((value, pos) => value.slice(0, pos) + value.slice(pos + 1), text)
  let removed = 0
  const retained = []
  if (equivalent(allRemoved)) {
    output = allRemoved
    removed = positions.length
  } else {
    // Descending offsets remain valid after edits to the right.
    for (const pos of positions) {
      const next = output.slice(0, pos) + output.slice(pos + 1)
      if (equivalent(next)) {
        output = next
        removed++
      } else {
        const { line, character } = original.getLineAndCharacterOfPosition(pos)
        retained.push({ line: line + 1, column: character + 1 })
      }
    }
  }
  if (!equivalent(output)) throw new Error(`Syntax tree changed: ${filename}`)
  return { output, removed, retained }
}

export function inventory() {
  const tracked = execFileSync('git', ['ls-files', '-z', '--', 'MercurionWebNg', 'MercurionWebNode'], { encoding: 'utf8' }).split('\0').filter(Boolean)
  const typescript = tracked.filter(file => file.endsWith('.ts'))
  const excluded = typescript.filter(file => file.includes('/generated/'))
  const files = typescript.filter(file => !excluded.includes(file))
  return { files, excluded }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const write = process.argv.includes('--write')
  const { files, excluded } = inventory()
  // Complete the analysis before making any workspace change.
  const results = files.map(file => {
    const before = readFileSync(file, 'utf8')
    return { file, before, ...removeOptionalSemicolons(before, file) }
  })
  const report = {
    mode: write ? 'write' : 'check',
    scanned: files.length,
    excluded,
    changed: results.filter(row => row.removed).length,
    removed: results.reduce((sum, row) => sum + row.removed, 0),
    files: results.map(({ before, output, ...row }) => row)
  }
  if (write) {
    for (const row of results) {
      if (readFileSync(row.file, 'utf8') !== row.before) throw new Error(`File changed during analysis: ${row.file}`)
    }
    for (const row of results) if (row.removed) writeFileSync(row.file, row.output)
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (!write && report.removed) process.exitCode = 1
}
