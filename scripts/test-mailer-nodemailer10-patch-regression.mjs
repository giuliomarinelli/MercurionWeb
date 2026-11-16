import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import ts from 'typescript'

const declarationPath = resolve('node_modules/@nestjs-modules/mailer/dist/interfaces/mailer-options.interface.d.ts')
const patch = await readFile('MercurionWebNode/patches/@nestjs-modules+mailer+2.3.7.patch', 'utf8')
const declaration = await readFile(declarationPath, 'utf8')

assert.equal([...patch.matchAll(/^diff --git /gm)].length, 1)
for (const transport of [
  ['JSONTransport', 'json-transport'],
  ['SendmailTransport', 'sendmail-transport'],
  ['SESTransport', 'ses-transport'],
  ['SMTPPool', 'smtp-pool'],
  ['SMTPTransport', 'smtp-transport'],
  ['StreamTransport', 'stream-transport']
]) {
  const [name, module] = transport
  assert.ok(patch.includes(`-import * as ${name} from 'nodemailer/lib/${module}';`))
  assert.ok(patch.includes(`+import type ${name} from 'nodemailer/lib/${module}';`))
  assert.ok(declaration.includes(`import type ${name} from 'nodemailer/lib/${module}';`))
}
assert.ok(patch.includes('-    defaults?: Options;'))
assert.ok(patch.includes('+    defaults?: MailDefaults;'))
assert.ok(declaration.includes('defaults?: MailDefaults;'))

const program = ts.createProgram([declarationPath], {
  allowSyntheticDefaultImports: true,
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  noEmit: true,
  skipLibCheck: false,
  target: ts.ScriptTarget.ES2023
})
const diagnostics = ts.getPreEmitDiagnostics(program).filter(
  diagnostic => diagnostic.file && resolve(diagnostic.file.fileName) === declarationPath
)
assert.deepEqual(
  diagnostics.map(diagnostic => `${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`),
  []
)

console.log('Mailer patch regression passed: Nodemailer 10 declarations compile.')
