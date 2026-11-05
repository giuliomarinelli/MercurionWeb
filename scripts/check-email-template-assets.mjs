import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { emailPreviewFixtures } from './email-preview-fixtures.mjs'

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

const fail = message => {
  throw new Error(`Email asset check failed: ${message}`)
}

if (!existsSync(registryPath)) {
  fail(`compiled registry is missing at ${registryPath}`)
}
if (!existsSync(templateRoot)) {
  fail(`compiled template directory is missing at ${templateRoot}`)
}

const { EMAIL_TEMPLATE_REGISTRY, assertEmailTemplateContext } = require(registryPath)
const { DeterministicHandlebarsAdapter } = require(join(templateRoot, 'deterministic-handlebars.adapter.js'))
const adapter = new DeterministicHandlebarsAdapter(templateRoot)
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

for (const [key, definition] of registeredAssets) {
  const context = emailPreviewFixtures[key]
  assertEmailTemplateContext(key, context)
  const mail = { data: { template: definition.asset, context } }
  await new Promise((resolve, reject) => {
    adapter.compile(mail, error => error ? reject(error) : resolve(), {
      template: { dir: templateRoot, options: { strict: true } },
      options: { partials: { dir: templateRoot } },
    })
  })
  const html = mail.data.html ?? ''
  if (!html.includes('<!DOCTYPE html>') || html.includes('{{') || !html.includes('name="viewport"')) {
    fail(`compiled asset ${key} did not render through the canonical layout`)
  }
  if (!/<(?:a|p)\b[^>]*style="[^"]*color:/.test(html)) {
    fail(`compiled asset ${key} is missing inline text/CTA styles`)
  }
}

console.log(`Verified ${registeredAssets.length} registered email templates and ${requiredPartials.length} layouts/partials from the compiled Nest artifact.`)
