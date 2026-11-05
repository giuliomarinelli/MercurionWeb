import assert from 'node:assert/strict'
import test from 'node:test'
import { removeOptionalSemicolons } from './typescript-semicolons.mjs'

test('removes terminators without changing embedded text or line endings', () => {
  const input = '// keep ;\r\nconst sql = "SELECT 1;";\r\nconst html = `<p>; CSS: color:red;</p>`;\r\n'
  assert.equal(removeOptionalSemicolons(input).output,
    '// keep ;\r\nconst sql = "SELECT 1;"\r\nconst html = `<p>; CSS: color:red;</p>`\r\n')
})

test('preserves loop delimiters, empty statements and inline separators', () => {
  const input = 'for (let i = 0; i < 2; i++) { run(); }\nwhile (wait());\nconst a = 1; const b = 2;\n'
  assert.equal(removeOptionalSemicolons(input).output,
    'for (let i = 0; i < 2; i++) { run() }\nwhile (wait());\nconst a = 1; const b = 2\n')
})

test('preserves ASI boundaries before expressions and computed class members', () => {
  for (const next of ['[1].forEach(run)', '(function () {})()', '`tagged`', '+value', '-value', '/pattern/.test(value)']) {
    const input = `const value = get();\n${next};\n`
    assert.ok(removeOptionalSemicolons(input).output.startsWith('const value = get();\n'), next)
  }
  assert.equal(removeOptionalSemicolons('class C { value = get();\n[key] = 1;\n}\n').output,
    'class C { value = get();\n[key] = 1\n}\n')
})

test('handles interfaces, overloads, decorators and class fields', () => {
  const input = 'interface I { value: string;\nrun(): void; }\n@decorator()\nclass C { value = 1;\nrun(): void;\nrun() {} }\n'
  const result = removeOptionalSemicolons(input)
  assert.equal(result.retained.length, 0)
  assert.equal(result.output.includes(';'), false)
  assert.equal(removeOptionalSemicolons(result.output).removed, 0)
})

test('rejects invalid input before writing', () => {
  assert.throws(() => removeOptionalSemicolons('const = ;'), /Invalid TypeScript/)
})

test('does not treat type punctuation inside JSDoc as source punctuation', () => {
  const comment = '/** @type {{a: string; b: number;}} */\n'
  assert.equal(removeOptionalSemicolons(comment + 'const x = 1;\n').output,
    comment + 'const x = 1\n')
})
