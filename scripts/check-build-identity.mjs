import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { assertBuildIdentitiesMatch, createBuildIdentity } from './build-identity.mjs'

const tempRoot = await mkdtemp(join(tmpdir(), 'mercurion-build-identity-'))
try {
  const revision = '0123456789abcdef0123456789abcdef01234567'
  const first = await createBuildIdentity({ revision })
  const second = await createBuildIdentity({ revision })
  assertBuildIdentitiesMatch(first, second)
  await writeFile(join(tempRoot, 'first.json'), `${JSON.stringify(first, null, 2)}\n`)
  await writeFile(join(tempRoot, 'second.json'), `${JSON.stringify(second, null, 2)}\n`)
  const firstBytes = await readFile(join(tempRoot, 'first.json'), 'utf8')
  const secondBytes = await readFile(join(tempRoot, 'second.json'), 'utf8')
  if (firstBytes !== secondBytes) throw new Error('Build identity generation is not deterministic')
  console.log(`Build identity drift check passed for ${first.version}@${first.revision}`)
} finally {
  await rm(tempRoot, { recursive: true, force: true })
}
