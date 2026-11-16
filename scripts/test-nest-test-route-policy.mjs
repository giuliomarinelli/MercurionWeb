import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'

const checker = resolve('scripts/check-nest-test-route-policy.mjs')
function check(composition, production = 'export class AppModule {}') {
  const temporary = mkdtempSync(join(tmpdir(), 'mercurion-test-route-policy-'))
  try {
    const source = join(temporary, 'MercurionWebNode/src')
    mkdirSync(join(source, 'test-utils'), { recursive: true })
    writeFileSync(join(source, 'app.module.ts'), production)
    writeFileSync(join(source, 'test-utils/test-application.module.ts'), composition)
    return spawnSync(process.execPath, [checker], { cwd: temporary, encoding: 'utf8' })
  } finally {
    if (dirname(resolve(temporary)) !== resolve(tmpdir()) || !temporary.includes('mercurion-test-route-policy-')) throw Error('Unsafe cleanup')
    rmSync(temporary, { recursive: true, force: true })
  }
}

const registration = '\n@Module({ imports: [AppModule], controllers: [TestController] })'
for (const declaration of ["import { TestController } from '../test.controller';", 'import { TestController } from "../test.controller"', "import {\n TestController\n} from '../test.controller'"]) {
  test(`accepts the real import independent of formatter: ${JSON.stringify(declaration)}`, () => {
    const result = check(declaration + registration)
    assert.equal(result.status, 0, result.stderr)
  })
}
test('rejects a commented import, missing registration and production leakage', () => {
  assert.equal(check("// import { TestController } from '../test.controller'" + registration).status, 1)
  assert.equal(check("import type { TestController } from '../test.controller'" + registration).status, 1)
  assert.equal(check("import { TestController } from '../test.controller'\n@Module({ imports: [AppModule] })").status, 1)
  assert.equal(check("import { TestController } from '../test.controller'" + registration, 'controllers: [TestController]').status, 1)
})
