import { assertBuildIdentitiesMatch } from './build-identity.mjs'

const identity = { version: '1.0.0', revision: '0123456789abcdef0123456789abcdef01234567' }
const mismatch = { ...identity, revision: 'fedcba9876543210fedcba9876543210fedcba98' }

try {
  assertBuildIdentitiesMatch(identity, mismatch)
  throw new Error('Mismatched build identity fixture unexpectedly passed')
} catch (error) {
  if (!(error instanceof Error) || !error.message.startsWith('Build identity mismatch:')) throw error
}

console.log('Build identity negative fixture passed')
