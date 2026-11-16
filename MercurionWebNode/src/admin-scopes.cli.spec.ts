import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { adminScopeService, exportAdminScopes } from './admin-scopes.cli'
import { Scope } from './app_modules/user/models/enums/scope.enum'

describe('offline administrator scope export', () => {
  const key = Buffer.alloc(32, 7).toString('base64')
  it('uses the administrator preset, random IVs and the real authenticated cipher', () => {
    const service = adminScopeService(key)
    const first = service.getEncryptedAdminScopes()
    expect(service.decryptScopes(...first)).toContain(Scope.AssignScopes)
    expect(service.decryptScopes(...first)).toContain(Scope.HandleTickets)
    expect(new Set(first).size).toBe(first.length)
    expect(service.getEncryptedAdminScopes()).not.toEqual(first)
    expect(() => adminScopeService(Buffer.alloc(32, 8).toString('base64')).decryptScopes(...first)).toThrow()
    expect(() => adminScopeService('bad-key')).toThrow()
  })
  it('exports only ciphertext, rejects overwrite and never changes private configuration', () => {
    const folder = mkdtempSync(join(tmpdir(), 'mercurion-admin-scopes-'))
    try {
      const config = join(folder, 'configuration.json')
      const output = join(folder, 'scopes.json')
      const original = JSON.stringify({ environment: 'preview', applicationSecrets: { APP_AES_SECRET: key } })
      writeFileSync(config, original)
      const count = exportAdminScopes(config, output)
      const ciphertext = JSON.parse(readFileSync(output, 'utf8')) as string[]
      expect(ciphertext).toHaveLength(count)
      expect(ciphertext.every(value => /^[a-f0-9]+$/.test(value))).toBe(true)
      expect(readFileSync(output, 'utf8')).not.toContain(key)
      expect(readFileSync(config, 'utf8')).toBe(original)
      expect(() => exportAdminScopes(config, output)).toThrow()
      expect(() => exportAdminScopes(config, join(folder, '..', 'scope-export-outside.json'))).toThrow()
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })
})
