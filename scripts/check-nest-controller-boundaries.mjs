#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const CONTROLLER_SUFFIX = '.controller.ts'

export function inspectControllerSource(source, relativePath) {
  const violations = []

  if (/@InjectRepository\s*\(|\bDataSource\b|\bRepository\s*</.test(source)) {
    violations.push(`${relativePath}: controllers must not depend on TypeORM repositories or DataSource`)
  }
  if (/from\s+['"][^'"]*(?:\/Models\/entities|\/repositories\/)[^'"]*['"]/.test(source)) {
    violations.push(`${relativePath}: controllers must not import persistence entities or repositories`)
  }

  const usesRawRequest = /@Req\s*\(|\bFastifyRequest\b/.test(source)
  if (usesRawRequest && !/transport-only:\s*raw request access\b/i.test(source)) {
    violations.push(`${relativePath}: raw request access requires a documented transport-only boundary`)
  }

  return violations
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(target)
    return entry.name.endsWith(CONTROLLER_SUFFIX) ? [target] : []
  })
}

export function checkControllerBoundaries(root) {
  const sourceRoot = path.join(root, 'src')
  return walk(sourceRoot).flatMap((file) => inspectControllerSource(
    fs.readFileSync(file, 'utf8'),
    path.relative(root, file).split(path.sep).join('/'),
  ))
}

function main() {
  const rootArg = process.argv.find((arg) => arg.startsWith('--root='))?.slice('--root='.length)
    ?? 'MercurionWebNode'
  const violations = checkControllerBoundaries(path.resolve(rootArg))
  if (violations.length) {
    console.error(violations.join('\n'))
    process.exitCode = 1
    return
  }
  console.log('Nest controller transport boundaries passed.')
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/(.:)/, '$1'))) {
  main()
}
