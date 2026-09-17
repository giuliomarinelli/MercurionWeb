import { createRequire } from 'node:module'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import Handlebars from 'handlebars'

const require = createRequire(import.meta.url)
const repositoryRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const templateRoot = join(repositoryRoot, 'MercurionWebNode', 'dist', 'src', 'app_modules', 'notification', 'email-templates')
const registryPath = join(repositoryRoot, 'MercurionWebNode', 'dist', 'src', 'app_modules', 'notification', 'email-template-registry.js')

const requiredPartials = [
  'layouts/email-shell.hbs',
  'partials/email-footer.hbs',
  'partials/email-logo.hbs',
  'partials/email-styles.hbs',
]

const fixtures = {
  'account-confirmation': { firstName: 'Ada', url: 'https://example.test/confirm' },
  'email-changed-new-contact': { firstName: 'Ada', newEmail: 'new@example.test' },
  'email-changed-old-contact': { firstName: 'Ada', newEmail: 'new@example.test' },
  'email-verification': { firstName: 'Ada', totp: '123456', period: 120 },
  'forgotten-password': { firstName: 'Ada', url: 'https://example.test/reset' },
  'password-changed': { firstName: 'Ada' },
  'mfa-login-code': { firstName: 'Ada', totp: '123456', period: 120, appName: 'Mercurion' },
  'mfa-disable-code': { firstName: 'Ada', totp: '123456', period: 120, appName: 'Mercurion' },
  'mfa-enable-code': { firstName: 'Ada', totp: '123456', period: 120, appName: 'Mercurion' },
  'help-ticket-opened-user': {
    ticketPublicId: 'T-123',
    ticketMessageBody: null,
    userFirstName: 'Ada',
    url: 'https://example.test/help',
  },
  'help-ticket-opened-support': {
    ticketPublicId: 'T-123',
    ticketMessageBody: 'A message',
    userFirstName: 'Ada',
    url: 'https://example.test/help',
  },
  'help-message-added': {
    ticketPublicId: 'T-123',
    ticketMessageBody: 'A message',
    userFirstName: 'Ada',
    url: 'https://example.test/help',
  },
  'help-support-replied': {
    ticketPublicId: 'T-123',
    ticketMessageBody: null,
    userFirstName: 'Ada',
    url: 'https://example.test/help',
  },
}

const fail = message => {
  throw new Error(`Email asset check failed: ${message}`)
}

if (!existsSync(registryPath)) {
  fail(`compiled registry is missing at ${registryPath}`)
}
if (!existsSync(templateRoot)) {
  fail(`compiled template directory is missing at ${templateRoot}`)
}

const { EMAIL_TEMPLATE_REGISTRY } = require(registryPath)
const registeredAssets = Object.entries(EMAIL_TEMPLATE_REGISTRY)

for (const [key, definition] of registeredAssets) {
  const assetPath = join(templateRoot, definition.asset)
  if (!existsSync(assetPath)) {
    fail(`registry asset ${key} is missing at ${assetPath}`)
  }
}

for (const relativeAsset of requiredPartials) {
  if (!existsSync(join(templateRoot, relativeAsset))) {
    fail(`required layout/partial ${relativeAsset} is missing`)
  }
}

const registerPartials = directory => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      registerPartials(entryPath)
    } else {
      const relativeAsset = relative(templateRoot, entryPath).replaceAll('\\', '/')
      if (!entry.name.endsWith('.hbs') || (!relativeAsset.startsWith('partials/') && !relativeAsset.startsWith('layouts/'))) {
        continue
      }
      const partialName = relativeAsset.replace(/\.hbs$/, '')
      Handlebars.registerPartial(partialName, readFileSync(entryPath, 'utf8'))
    }
  }
}

registerPartials(templateRoot)

for (const [key, definition] of registeredAssets) {
  const source = readFileSync(join(templateRoot, definition.asset), 'utf8')
  const html = Handlebars.compile(source, { strict: true })(fixtures[key])
  if (!html.includes('<!DOCTYPE html>') || html.includes('{{')) {
    fail(`compiled asset ${key} did not render through the canonical layout`)
  }
}

console.log(`Verified ${registeredAssets.length} registered email templates and ${requiredPartials.length} layouts/partials from the compiled Nest artifact.`)
