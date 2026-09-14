import {
  BrowserStorageRegistry,
  storageDescriptor
} from './browser-storage-registry'

describe('BrowserStorageRegistry', () => {
  let registry: BrowserStorageRegistry

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    registry = new BrowserStorageRegistry()
  })

  it('round-trips current version values through their typed descriptor', () => {
    const descriptor = storageDescriptor<{ owner: string; expiresAt: number }>('wsRefreshLock')
    const value = { owner: 'tab-a', expiresAt: 123 }

    registry.set(descriptor, value)

    expect(registry.get(descriptor)).toEqual(value)
    expect(localStorage.getItem(descriptor.key)).toContain('"expiresAt":123')
    expect(descriptor.version).toBe(1)
  })

  it('migrates a supported legacy theme key and removes the legacy value', () => {
    localStorage.setItem('tw_theme', 'dark')

    const value = registry.get(storageDescriptor<Record<string, unknown>>('theme'))

    expect(value).toEqual({ theme: 'dark', themeOwner: 'User', isEnabled: true })
    expect(localStorage.getItem('tw_theme')).toBeNull()
    expect(localStorage.getItem('mercurion.v1.ui.theme')).not.toBeNull()
  })

  it('quarantines malformed structured data without throwing', () => {
    const descriptor = storageDescriptor<{ owner: string; expiresAt: number }>('wsRefreshLock')
    localStorage.setItem(descriptor.key, '{"owner":"missing-expiry"}')

    expect(() => registry.get(descriptor)).not.toThrow()
    expect(registry.get(descriptor)).toBeNull()
    expect(localStorage.getItem(descriptor.key)).toBeNull()
  })

  it('does not claim unknown versioned keys', () => {
    localStorage.setItem('mercurion.v2.ui.theme', '{"theme":"dark"}')

    expect(registry.descriptorForKey('mercurion.v2.ui.theme')).toBeNull()
    expect(registry.get(storageDescriptor<Record<string, unknown>>('theme'))).toBeNull()
    expect(localStorage.getItem('mercurion.v2.ui.theme')).toBe('{"theme":"dark"}')
  })

  it('removes only the requested descriptor and preserves unrelated registered data', () => {
    const theme = storageDescriptor<Record<string, unknown>>('theme')
    const marker = storageDescriptor<string>('login')
    registry.set(theme, { theme: 'dark', themeOwner: 'User', isEnabled: true })
    registry.set(marker, 'Test')

    registry.remove(theme)

    expect(localStorage.getItem(theme.key)).toBeNull()
    expect(registry.get(marker)).toBe('Test')
  })

  it('decodes only registered events from the descriptor medium', () => {
    const descriptor = storageDescriptor<string>('login')
    const value = registry.event(new StorageEvent('storage', {
      key: descriptor.key,
      newValue: 'Test',
      storageArea: localStorage
    }))

    expect(value?.descriptor.id).toBe('login')
    expect(value?.value).toBe('Test')
    expect(registry.event(new StorageEvent('storage', {
      key: 'unowned',
      newValue: 'ignored',
      storageArea: localStorage
    }))).toBeNull()
  })
})
