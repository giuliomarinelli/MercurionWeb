#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

export function inspectSource(source, relativePath) {
  const violations = []
  if (/exports\s*:\s*\[[\s\S]*?\bTypeOrmModule\b[\s\S]*?\]/m.test(source)) {
    violations.push(`${relativePath}: exports TypeOrmModule`)
  }

  const consumer = relativePath.replaceAll('\\', '/').match(/^src\/app_modules\/([^/]+)\//)?.[1]
  if (!consumer) return violations
  const imports = new Map()
  for (const match of source.matchAll(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g)) {
    for (const imported of match[1].split(',').map((entry) => entry.trim().split(/\s+as\s+/)[0])) {
      imports.set(imported, match[2])
    }
  }
  for (const match of source.matchAll(/@InjectRepository\((\w+)\)/g)) {
    const owner = imports.get(match[1])?.match(/app_modules\/([^/]+)/)?.[1]
    if (owner && owner !== consumer) {
      violations.push(`${relativePath}: injects ${owner}-owned repository ${match[1]}`)
    }
  }
  return violations
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(target) : entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [target] : []
  })
}

export function checkRepositoryBoundaries(root) {
  const sourceRoot = path.join(root, 'src')
  return walk(sourceRoot).flatMap((file) => inspectSource(
    fs.readFileSync(file, 'utf8'),
    path.relative(root, file)
  ))
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/(.:)/, '$1'))) {
  const rootArg = process.argv.find((arg) => arg.startsWith('--root='))?.slice('--root='.length) ?? 'MercurionWebNode'
  const violations = checkRepositoryBoundaries(path.resolve(rootArg))
  if (violations.length) {
    console.error(violations.join('\n'))
    process.exitCode = 1
  } else {
    console.log('Nest repository ownership boundaries passed.')
  }
}
