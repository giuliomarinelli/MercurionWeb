import {
  KETCHER_EDITOR_PROFILES,
  buildKetcherResourceUrl
} from './ketcher-editor.config'

describe('Ketcher editor profiles', () => {
  it('keeps the standard profile focused on Mercurion molecule editing', () => {
    const hidden = new Set(KETCHER_EDITOR_PROFILES.std.hiddenControls)

    expect(KETCHER_EDITOR_PROFILES.std.disableMacromoleculesEditor).toBeTrue()
    expect(hidden.has('open')).toBeTrue()
    expect(hidden.has('save')).toBeTrue()
    expect(hidden.has('reaction-plus')).toBeTrue()
    expect(hidden.has('miew')).toBeTrue()

    expect(hidden.has('layout')).toBeFalse()
    expect(hidden.has('clean')).toBeFalse()
    expect(hidden.has('zoom-list')).toBeFalse()
    expect(hidden.has('fullscreen')).toBeFalse()
    expect(hidden.has('undo')).toBeFalse()
    expect(hidden.has('redo')).toBeFalse()
  })

  it('defines live analysis strictly by further subtraction from the standard profile', () => {
    const standard = new Set(KETCHER_EDITOR_PROFILES.std.hiddenControls)
    const live = new Set(KETCHER_EDITOR_PROFILES.live.hiddenControls)

    for (const control of standard) {
      expect(live.has(control)).withContext(control).toBeTrue()
    }

    expect(live.size).toBeGreaterThan(standard.size)
    expect(live.has('copies')).toBeTrue()
    expect(live.has('paste')).toBeTrue()
    expect(live.has('cut')).toBeTrue()
    expect(live.has('layout')).toBeTrue()
    expect(live.has('zoom-list')).toBeTrue()
    expect(live.has('fullscreen')).toBeTrue()

    // Core fast-edit controls stay available.
    expect(live.has('clean')).toBeFalse()
    expect(live.has('undo')).toBeFalse()
    expect(live.has('redo')).toBeFalse()
    expect(live.has('bonds')).toBeFalse()
    expect(live.has('erase')).toBeFalse()
    expect(live.has('charge-plus')).toBeFalse()
    expect(live.has('charge-minus')).toBeFalse()
  })

  it('builds standalone URLs with the profile query parameters', () => {
    const resourceUrl = buildKetcherResourceUrl('/ketcher/index.html', 'live')
    const url = new URL(resourceUrl, 'https://example.test')

    expect(url.pathname).toBe('/ketcher/index.html')
    expect(url.searchParams.get('disableMacromoleculesEditor')).toBe('true')

    const hiddenControls = url.searchParams.get('hiddenControls')?.split(',') ?? []
    expect(hiddenControls).toContain('open')
    expect(hiddenControls).toContain('zoom-list')
    expect(hiddenControls).not.toContain('clean')
  })

  it('preserves existing query parameters on the Ketcher resource URL', () => {
    const resourceUrl = buildKetcherResourceUrl('/ketcher/index.html?existing=1', 'std')
    const url = new URL(resourceUrl, 'https://example.test')

    expect(url.searchParams.get('existing')).toBe('1')
    expect(url.searchParams.get('disableMacromoleculesEditor')).toBe('true')
    expect(url.searchParams.get('hiddenControls')).not.toBeNull()
  })
})
