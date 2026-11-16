import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

const productionRoot = join(process.cwd(), 'MercurionWebNg', 'src', 'app')

const explicitAnyPatterns = [
  [/\$any\s*\(/, 'Angular $any escape hatch'],
  [/\bas\s+any\b/, 'explicit any assertion'],
  [/:\s*any\b/, 'explicit any annotation'],
  [/<\s*any\b/, 'explicit any generic argument'],
  [/\b(?:Array|Map|Promise|Record|Set|FormArray|FormControl|FormGroup|Observable|HttpEvent|HttpRequest)<[^>\r\n]*\bany\b/, 'explicit any generic argument']
]

const untypedFormPatterns = [
  [/\b(?:FormArray|FormControl|FormGroup|FormRecord)\s*!\s*[;=]/, 'untyped form declaration'],
  [/\b(?:FormArray|FormControl|FormGroup|FormRecord)\s*:\s*(?:FormArray|FormControl|FormGroup|FormRecord)\s*[;=|]/, 'untyped form declaration'],
  [/\b(?:FormArray|FormControl|FormGroup|FormRecord)\s*[;=]/, 'untyped form declaration']
]

const unsafeAssertionPatterns = [
  [/\bas\s+any\b/, 'unsafe any assertion'],
  [/\b[A-Za-z_$][\w$]*!\s*[:=]/, 'definite-assignment assertion'],
  [/\b[A-Za-z_$][\w$]*!\s*\./, 'non-null assertion'],
  [/[)\]}]!\s*\./, 'non-null assertion']
]

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const file = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(file))
    } else if (/\.(?:ts|html)$/.test(entry.name) && !entry.name.endsWith('.spec.ts')) {
      files.push(file)
    }
  }

  return files
}

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length
}

function findViolations(file, source, patterns, kind) {
  const violations = []
  for (const [pattern, description] of patterns) {
    pattern.lastIndex = 0
    const match = pattern.exec(source)
    if (match) {
      violations.push({
        file,
        line: lineNumber(source, match.index),
        kind,
        description
      })
    }
  }
  return violations
}

export function collectAngularTypingViolations(sourceFiles) {
  return sourceFiles.flatMap(({ file, source }) => [
    ...findViolations(file, source, explicitAnyPatterns, 'explicit-any'),
    ...findViolations(file, source, untypedFormPatterns, 'untyped-form'),
    ...(file.endsWith('.ts')
      ? findViolations(file, source, unsafeAssertionPatterns, 'unsafe-assertion')
      : [])
  ])
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = await collectSourceFiles(productionRoot)
  const sourceFiles = await Promise.all(files.map(async file => ({
    file: relative(process.cwd(), file).replaceAll('\\', '/'),
    source: await readFile(file, 'utf8')
  })))
  const violations = collectAngularTypingViolations(sourceFiles)

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({
      version: 1,
      root: 'MercurionWebNg/src/app',
      filesScanned: sourceFiles.length,
      violations
    }, null, 2))
  }

  if (violations.length > 0) {
    if (!process.argv.includes('--json')) {
      console.error(`Angular typing policy violations:\n${violations.map(v =>
        `${v.file}:${v.line} ${v.kind}: ${v.description}`
      ).join('\n')}`)
    }
    process.exit(1)
  }

  if (!process.argv.includes('--json')) {
    console.log(`Angular typing policy passed (${sourceFiles.length} production files scanned).`)
  }
}
