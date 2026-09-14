import { TestBed } from '@angular/core/testing'
import { BrowserStorageRegistry, storageDescriptor } from '../browser-storage-registry'
import { ThemeManagerService } from './theme-manager.service'
import { ThemeStorage } from '../../Models/theme.models'

describe('ThemeManagerService', () => {
  let service: ThemeManagerService
  let mediaQuery: { matches: boolean; addEventListener: jasmine.Spy; removeEventListener: jasmine.Spy }
  let systemPreferenceListener: (event: Event) => void
  let storageListener: (event: Event) => void

  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-theme')
    const originalAddEventListener = window.addEventListener
    spyOn(window, 'addEventListener').and.callFake((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
      if (type === 'storage') {
        storageListener = listener as (event: Event) => void
      }
      originalAddEventListener.call(window, type, listener, options)
    })
    spyOn(window, 'removeEventListener').and.callThrough()
    mediaQuery = {
      matches: false,
      addEventListener: jasmine.createSpy('addEventListener').and.callFake((_type: string, listener: (event: Event) => void) => {
        systemPreferenceListener = listener
      }),
      removeEventListener: jasmine.createSpy('removeEventListener')
    }
    spyOn(globalThis, 'matchMedia').and.returnValue(mediaQuery as unknown as MediaQueryList)
  })

  afterEach(() => {
    TestBed.resetTestingModule()
  })

  function createService(): ThemeManagerService {
    TestBed.configureTestingModule({
      providers: [BrowserStorageRegistry, ThemeManagerService]
    })
    service = TestBed.inject(ThemeManagerService)
    return service
  }

  it('uses the system preference on first load and applies the root state', () => {
    createService()

    expect(service.chosenTheme()).toBe('OS')
    expect(service.theme()).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBeFalse()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('restores saved explicit light and dark choices', () => {
    const descriptor = storageDescriptor<ThemeStorage>('theme')
    localStorage.setItem(descriptor.key, JSON.stringify({ theme: 'dark', themeOwner: 'User', isEnabled: true }))

    createService()

    expect(service.chosenTheme()).toBe('dark')
    expect(service.theme()).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBeTrue()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('tracks OS changes only while system mode is selected', () => {
    createService()
    mediaQuery.matches = true
    systemPreferenceListener(new Event('change'))
    expect(service.theme()).toBe('dark')

    service.chooseTheme('light')
    mediaQuery.matches = false
    systemPreferenceListener(new Event('change'))
    expect(service.theme()).toBe('light')
  })

  it('converges from a cross-tab theme update without writing it back', () => {
    createService()
    const descriptor = storageDescriptor<ThemeStorage>('theme')
    const setSpy = spyOn(BrowserStorageRegistry.prototype, 'set').and.callThrough()

    storageListener(new StorageEvent('storage', {
      key: descriptor.key,
      newValue: JSON.stringify({ theme: 'dark', themeOwner: 'User', isEnabled: true }),
      storageArea: localStorage
    }))

    expect(service.theme()).toBe('dark')
    expect(service.chosenTheme()).toBe('dark')
    expect(setSpy).not.toHaveBeenCalled()
  })

  it('migrates legacy and rejects corrupt stored theme values safely', () => {
    localStorage.setItem('tw_theme', 'dark')
    createService()
    expect(service.chosenTheme()).toBe('dark')
    expect(localStorage.getItem('tw_theme')).toBeNull()

    TestBed.resetTestingModule()
    localStorage.setItem(storageDescriptor<ThemeStorage>('theme').key, '{bad')
    createService()
    expect(service.chosenTheme()).toBe('OS')
    expect(service.theme()).toBe('light')
  })

  it('removes both owned listeners when the service injector is destroyed', () => {
    createService()
    TestBed.resetTestingModule()

    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith('change', jasmine.any(Function), undefined)
    expect(window.removeEventListener).toHaveBeenCalledWith('storage', jasmine.any(Function), undefined)
  })
})
