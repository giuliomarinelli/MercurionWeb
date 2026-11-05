import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { emailPreviewFixtures } from './email-preview-fixtures.mjs'

const require = createRequire(import.meta.url)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const compiled = join(root, 'MercurionWebNode/dist/src/app_modules/notification')
const { EMAIL_TEMPLATE_REGISTRY, assertEmailTemplateContext } = require(join(compiled, 'email-template-registry.js'))
const { DeterministicHandlebarsAdapter } = require(join(compiled, 'email-templates/deterministic-handlebars.adapter.js'))
const templateRoot = join(compiled, 'email-templates')
const output = resolve(process.argv[2] ?? join(root, 'MercurionWebNode/test-results/email-previews'))
const adapter = new DeterministicHandlebarsAdapter(templateRoot)

mkdirSync(output, { recursive: true })
const previews = []
for (const [key, definition] of Object.entries(EMAIL_TEMPLATE_REGISTRY)) {
  const context = emailPreviewFixtures[key]
  assertEmailTemplateContext(key, context)
  const mail = { data: { template: definition.asset, context } }
  await new Promise((resolve, reject) => {
    adapter.compile(mail, error => error ? reject(error) : resolve(), {
      template: { dir: templateRoot, options: { strict: true } },
      options: { partials: { dir: templateRoot } },
    })
  })
  if (!mail.data.html?.includes('<!DOCTYPE html>')) throw new Error(`Invalid preview: ${key}`)
  const file = `${key}.html`
  writeFileSync(join(output, file), mail.data.html)
  previews.push({ key, subject: definition.subject(context), file, url: context.url ?? null })
}

writeFileSync(join(output, 'manifest.json'), JSON.stringify(previews, null, 2))
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')
const links = previews.map(item => `<li><a href="${item.file}">${escape(item.subject)}</a> <small>(${item.key})</small></li>`).join('\n')
writeFileSync(join(output, 'index.html'), `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Mercurion — Anteprime e-mail QA</title></head>
<body><h1>Anteprime e-mail Mercurion</h1><p>Dati sintetici, nessun invio. Rendering prodotto dall’adapter compilato usato dal mailer.</p><ul>${links}</ul></body></html>`)
console.log(`Rendered ${previews.length} email previews without SMTP in ${output}`)
