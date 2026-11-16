import { DOCUMENT, isPlatformBrowser } from '@angular/common'
import { Injectable, PLATFORM_ID, inject, signal, computed } from '@angular/core'
import { Theme, ThemeChoice, ThemeOwner, ThemeStorage } from '../../Models/theme.models'
import { BrowserStorageRegistry, storageDescriptor } from '../browser-storage-registry'
import { injectBrowserResourceOwner } from '../../utils/browser-resource-owner.util'

const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)'

@Injectable({ providedIn: 'root' })
export class ThemeManagerService {
  private readonly document = inject(DOCUMENT)
  private readonly platformId = inject(PLATFORM_ID)
  private readonly isBrowser = isPlatformBrowser(this.platformId)
  private readonly resources = injectBrowserResourceOwner()
  private readonly themeStorage = storageDescriptor<ThemeStorage>('theme')
  private readonly mediaQuery = this.isBrowser ? globalThis.matchMedia(THEME_MEDIA_QUERY) : null

  private readonly _theme = signal<Theme>('light')
  private readonly _themeOwner = signal<ThemeOwner>('OS')
  private readonly _chosenTheme = signal<ThemeChoice>('OS')

  readonly theme = this._theme.asReadonly()
  readonly themeOwner = this._themeOwner.asReadonly()
  readonly chosenTheme = this._chosenTheme.asReadonly()
  readonly isLightUserTheme = computed(() => this._theme() === 'light' && this._themeOwner() === 'User')
  readonly isDarkUserTheme = computed(() => this._theme() === 'dark' && this._themeOwner() === 'User')

  constructor(private readonly storage: BrowserStorageRegistry = new BrowserStorageRegistry()) {
    this.restoreTheme()

    if (this.isBrowser && this.mediaQuery) {
      this.resources.addEventListener(this.mediaQuery, 'change', this.handleSystemPreferenceChange)
      this.resources.addEventListener(globalThis, 'storage', this.handleCrossTabThemeSwitch)
    }

  }

  get isSystemLight(): boolean {
    return this.getOsDefaultTheme === 'light'
  }

  get isSystemDark(): boolean {
    return this.getOsDefaultTheme === 'dark'
  }

  chooseTheme(chosen: ThemeChoice): void {
    const theme = chosen === 'OS' ? this.getOsDefaultTheme : chosen
    this._chosenTheme.set(chosen)
    this._themeOwner.set(chosen === 'OS' ? 'OS' : 'User')
    this.setResolvedTheme(theme)
    this.persistTheme(chosen)
  }

  get getOsDefaultTheme(): Theme {
    return this.mediaQuery?.matches ? 'dark' : 'light'
  }

  private readonly handleSystemPreferenceChange = (): void => {
    if (this._themeOwner() === 'OS') {
      this.setResolvedTheme(this.getOsDefaultTheme)
    }
  }

  private readonly handleCrossTabThemeSwitch = (event: Event): void => {
    const storageEvent = event as StorageEvent
    const change = this.storage.event(storageEvent)
    if (!change || change.descriptor.id !== 'theme') {
      return
    }

    const stored = change.value as ThemeStorage | null
    if (!stored || stored.isEnabled === false) {
      this.chooseTheme('OS')
      return
    }

    const nextChoice = stored.themeOwner === 'OS'
      ? 'OS'
      : stored.theme === 'dark' || stored.theme === 'light'
        ? stored.theme
        : 'OS'

    this.applyChoiceFromExternalSource(nextChoice)
  }

  private restoreTheme(): void {
    const stored = this.storage.get(this.themeStorage)
    if (!stored || stored.isEnabled === false) {
      this.applyChoiceFromExternalSource('OS')
      return
    }

    const choice: ThemeChoice = stored.themeOwner === 'OS'
      ? 'OS'
      : stored.theme === 'dark' || stored.theme === 'light'
        ? stored.theme
        : 'OS'

    this.applyChoiceFromExternalSource(choice)
  }

  private applyChoiceFromExternalSource(choice: ThemeChoice): void {
    this._chosenTheme.set(choice)
    this._themeOwner.set(choice === 'OS' ? 'OS' : 'User')
    this.setResolvedTheme(choice === 'OS' ? this.getOsDefaultTheme : choice)
  }

  private persistTheme(choice: ThemeChoice): void {
    this.storage.set(this.themeStorage, {
      theme: choice === 'OS' ? null : choice,
      themeOwner: choice === 'OS' ? 'OS' : 'User',
      isEnabled: true
    })
  }

  private applyTheme(theme: Theme): void {
    if (!this.isBrowser) {
      return
    }

    const root = this.document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.setAttribute('data-theme', theme)
  }

  private setResolvedTheme(theme: Theme): void {
    this._theme.set(theme)
    this.applyTheme(theme)
  }
}
