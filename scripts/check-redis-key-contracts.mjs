import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('MercurionWebNode/src')
const governedPrefixes = [
  'session:', 'user_sessions:', 'issued:', 'revoked:', 'fingerprint:',
  'fingerprintsWhiteList:', 'trustedLocation:', 'knownDeviceId:', 'auth:',
  'mfa:', 'feedback:send:', 'access_token:', 'oauth2:state:',
  'oauth2:redirect_to:', 'oauth2:refresh_lock:', 'change:', 'recovery:',
  'pwd:', 'email_change_lock:', 'phone_change_lock:',
  'email_registration_lock:', 'changePasswordLock:'
]

const files = []
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) visit(fullPath)
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) files.push(fullPath)
  }
}
visit(root)

const violations = []
for (const file of files) {
  if (file.endsWith(path.join('redis', 'contracts', 'redis-contracts.ts'))) continue
  const source = fs.readFileSync(file, 'utf8')
  for (const prefix of governedPrefixes) {
    const templateLiteral = new RegExp('`' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    if (templateLiteral.test(source)) {
      violations.push(`${path.relative(process.cwd(), file)} contains raw ${prefix} template key`)
    }
  }
  if (/redisService\.getClient\(\)\.(incr|set|del|ttl|smembers|unlink)/.test(source)) {
    violations.push(`${path.relative(process.cwd(), file)} bypasses the typed Redis adapter`)
  }
}

if (violations.length > 0) {
  console.error(violations.join('\n'))
  process.exit(1)
}

console.log('Redis key namespace and TTL architecture checks passed')
