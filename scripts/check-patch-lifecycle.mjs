import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join, normalize, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(process.cwd())
const registryPath = join(root, 'docs', 'autonomous-development', 'patch-registry.json')

function normalizePath(value) {
  return normalize(value).replaceAll('\\', '/')
}

function packageLockPath(packageName) {
  return `node_modules/${packageName}`
}

function collectDirectVersions(manifests) {
  const versions = new Map()
  for (const manifest of manifests) {
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      for (const [name, version] of Object.entries(manifest[section] ?? {})) {
        versions.set(name, version)
      }
    }
  }
  return versions
}

function collectPatchFiles(directory, rootPath, output = []) {
  for (const entry of directory) {
    const file = join(entry.directory, entry.name)
    if (entry.isDirectory) {
      collectPatchFiles(entry.children, rootPath, output)
    } else if (entry.name.endsWith('.patch')) {
      output.push(normalizePath(relative(rootPath, file)))
    }
  }
  return output
}

export function evaluatePatchLifecycle({
  registry,
  lockfile,
  manifests,
  patchFiles,
  installedPackages,
  availableFiles = new Set(),
  today = new Date().toISOString().slice(0, 10)
}) {
  const violations = []
  const directVersions = collectDirectVersions(manifests)
  const retained = registry.retainedPatches ?? []
  const retainedPaths = new Set()

  for (const patch of retained) {
    if (retainedPaths.has(patch.patchPath)) {
      violations.push(`duplicate registry entry: ${patch.patchPath}`)
    }
    retainedPaths.add(patch.patchPath)

    for (const field of [
      'package',
      'resolvedVersion',
      'patchPath',
      'owner',
      'rationale',
      'behavioralImpact',
      'upstreamReference',
      'removalDeadline',
      'removalCondition',
      'regressionTest'
    ]) {
      if (!patch[field]) violations.push(`incomplete patch metadata: ${patch.patchPath ?? patch.package}`)
    }

    if (patch.removalDeadline < today) {
      violations.push(`patch removal deadline elapsed: ${patch.package}@${patch.resolvedVersion}`)
    }
    if (!patchFiles.has(patch.patchPath)) {
      violations.push(`registered patch file is missing: ${patch.patchPath}`)
      continue
    }
    if (!availableFiles.has(patch.regressionTest)) {
      violations.push(`registered regression test is missing: ${patch.regressionTest}`)
    }

    const content = patchFiles.get(patch.patchPath)
    const headers = [...content.matchAll(/^diff --git a\/(.+) b\/(.+)$/gm)]
    const targetFiles = new Set(headers.map(([, from, to]) => to))
    for (const target of patch.targetFiles ?? []) {
      if (!targetFiles.has(target)) {
        violations.push(`patch target is not declared in diff: ${patch.patchPath} -> ${target}`)
      }
    }
    if (headers.length !== (patch.targetFiles ?? []).length) {
      violations.push(`patch target count mismatch: ${patch.patchPath}`)
    }
    for (const snippet of [...(patch.delta?.before ?? []), ...(patch.delta?.after ?? [])]) {
      if (!content.includes(snippet)) {
        violations.push(`patch regression delta is missing: ${patch.patchPath} -> ${snippet}`)
      }
    }
    if (/\0|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|password\s*[:=]|token\s*[:=]/i.test(content)) {
      violations.push(`patch contains prohibited binary or credential material: ${patch.patchPath}`)
    }

    const directVersion = directVersions.get(patch.package)
    if (directVersion !== patch.resolvedVersion) {
      violations.push(`patch package is not an exact direct dependency: ${patch.package}@${patch.resolvedVersion}`)
    }
    const lockEntry = lockfile.packages?.[packageLockPath(patch.package)]
    if (lockEntry?.version !== patch.resolvedVersion) {
      violations.push(`patch lockfile version mismatch: ${patch.package}@${patch.resolvedVersion}`)
    }
    const installed = installedPackages.get(patch.package)
    if (!installed) {
      violations.push(`patch target is not installed: ${patch.package}`)
    } else if (installed.version !== patch.resolvedVersion) {
      violations.push(`installed patch target version mismatch: ${patch.package}@${installed.version}`)
    }
    if (!patch.targetFiles?.every(file => installed?.files.has(file))) {
      violations.push(`installed patch target file is missing: ${patch.package}`)
    }
  }

  for (const patchPath of patchFiles.keys()) {
    if (!retainedPaths.has(patchPath)) violations.push(`orphan patch file: ${patchPath}`)
  }

  for (const removed of registry.removedPatches ?? []) {
    if (!removed.package || !removed.historicalPatchPath || !removed.removedAfter || !removed.reason) {
      violations.push(`incomplete removed patch record: ${removed.package ?? 'unknown'}`)
    }
    if (patchFiles.has(removed.historicalPatchPath)) {
      violations.push(`obsolete patch file is still present: ${removed.historicalPatchPath}`)
    }
  }

  return violations
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const children = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      children.push({ directory: path, name: entry.name, isDirectory: true, children: await walk(path) })
    } else {
      children.push({ directory, name: entry.name, isDirectory: false })
    }
  }
  return children
}

export async function runPatchLifecycle(rootPath = root) {
  const registry = JSON.parse(await readFile(join(rootPath, 'docs', 'autonomous-development', 'patch-registry.json'), 'utf8'))
  const rootManifest = JSON.parse(await readFile(join(rootPath, 'package.json'), 'utf8'))
  const manifests = [rootManifest]
  for (const workspace of rootManifest.workspaces ?? []) {
    manifests.push(JSON.parse(await readFile(join(rootPath, workspace, 'package.json'), 'utf8')))
  }
  const lockfile = JSON.parse(await readFile(join(rootPath, 'package-lock.json'), 'utf8'))
  const patchFiles = new Map()
  for (const patchDirectory of registry.patchDirectories ?? []) {
    const directory = join(rootPath, patchDirectory)
    let entries
    try {
      entries = await walk(directory)
    } catch (error) {
      if (error.code === 'ENOENT') continue
      throw error
    }
    for (const patchPath of collectPatchFiles(entries, rootPath)) {
      patchFiles.set(patchPath, await readFile(join(rootPath, patchPath), 'utf8'))
    }
  }
  const installedPackages = new Map()
  for (const patch of registry.retainedPatches ?? []) {
    const packageRoot = join(rootPath, 'node_modules', ...patch.package.split('/'))
    const packageManifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'))
    const files = new Set()
    for (const target of patch.targetFiles ?? []) {
      const targetPath = join(rootPath, target)
      try {
        await readFile(targetPath)
        files.add(target)
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
    }
    installedPackages.set(patch.package, { version: packageManifest.version, files })
  }
  const availableFiles = new Set()
  for (const file of [
    ...await readdir(join(rootPath, 'scripts')),
    ...await readdir(join(rootPath, 'docs', 'autonomous-development'))
  ]) {
    availableFiles.add(file)
  }
  for (const patch of registry.retainedPatches ?? []) {
    availableFiles.add(normalizePath(relative(rootPath, join(rootPath, patch.regressionTest))))
  }
  const violations = evaluatePatchLifecycle({
    registry,
    lockfile,
    manifests,
    patchFiles,
    installedPackages,
    availableFiles
  })
  if (violations.length > 0) {
    throw new Error(`Patch lifecycle check failed:\n${violations.join('\n')}`)
  }
  return {
    retainedCount: registry.retainedPatches?.length ?? 0,
    removedCount: registry.removedPatches?.length ?? 0,
    patchFiles: [...patchFiles.keys()]
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runPatchLifecycle()
  console.log(
    `Patch lifecycle passed: ${result.retainedCount} retained, ` +
    `${result.removedCount} removed records, ${result.patchFiles.length} patch files.`
  )
}

assert.equal(typeof evaluatePatchLifecycle, 'function')
