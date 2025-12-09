import { Injectable, signal, computed, effect } from '@angular/core';
import { Theme, ThemeChoice, ThemeOwner } from '../../Models/theme.models';

@Injectable({ providedIn: 'root' })
export class ThemeManagerService {

  private readonly themeStorageKey = 'tw_theme'

  private readonly _theme = signal<Theme>(this.getOsDefaultTheme)
  private readonly _themeOwner = signal<ThemeOwner>('OS')
  private readonly _chosenTheme = signal<ThemeChoice>('OS')

  // Pubblici readonly Signals!
  readonly theme = this._theme.asReadonly()
  readonly themeOwner = this._themeOwner.asReadonly()
  readonly chosenTheme = this._chosenTheme.asReadonly()

  // Computed signals utili per il template
  readonly isLightUserTheme = computed(() => this._theme() === 'light' && this._themeOwner() === 'User')
  readonly isDarkUserTheme = computed(() => this._theme() === 'dark' && this._themeOwner() === 'User')

  get isSystemLight(): boolean {
    return this.getOsDefaultTheme === 'light'
  }

  get isSystemDark(): boolean {
    return this.getOsDefaultTheme === 'dark'
  }



  constructor() {

    this.initTheme()

    // Reactive effect: applica il tema ogni volta che cambia
    effect(() => this.applyTheme(this._theme()))

    // Reactive effect: salva la preferenza se user
    effect(() => {
      if (this._themeOwner() === 'User') this.saveThemeConfig(this._theme())
    })

    // OS listener reattivo
    this.getOsDarkModeMediaQuery().addEventListener('change', () => {
      this.updateOsTheme()
    })
  }

  // Cambio tema manuale
  chooseTheme(chosen: ThemeChoice) {
    this._chosenTheme.set(chosen)
    this._themeOwner.set(chosen === 'OS' ? 'OS' : 'User')

    if (chosen === 'OS') {
      this.clearThemeConfig();
      this._theme.set(this.getOsDefaultTheme)
    } else {
      this._theme.set(chosen)
    }
  }

  get getOsDefaultTheme(): Theme {
    return this.getOsDarkModeMediaQuery().matches ? 'dark' : 'light'
  }

  private handleCrossTabThemeSwitch = (e: StorageEvent): void => {
    if (e.key !== this.themeStorageKey) {
      return
    }

    const parsed = this.deserializeThemeConfig(e.newValue)

    if (!parsed) {
      this.chooseTheme('OS')
      return
    }

    const nextChoice: ThemeChoice =
      typeof parsed === 'string'
        ? parsed
        : parsed.themeOwner === 'OS'
          ? 'OS'
          : parsed.theme ?? this.getOsDefaultTheme

    this.chooseTheme(nextChoice)
  }

  private initTheme(): void {
    window.addEventListener('storage', this.handleCrossTabThemeSwitch)
    if (this.hasSavedThemeConfig()) {
      this.restoreThemeConfig()
    } else if (this._chosenTheme() === 'OS') {
      this.clearThemeConfig()
    }
  }

  updateOsTheme(): void {
    if (this._themeOwner() === 'OS') {
      this._theme.set(this.getOsDefaultTheme)
    }
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.setAttribute('data-theme', 'dark')
    } else {
      root.classList.remove('dark')
      root.removeAttribute('data-theme')
    }
  }

  private saveThemeConfig(theme: Theme): void {
    const payload = {
      theme,
      themeOwner: 'User',
      isEnabled: true
    }
    localStorage.setItem(this.themeStorageKey, JSON.stringify(payload))
  }

  private restoreThemeConfig(): void {
    const themeConfig = this.deserializeThemeConfig(localStorage.getItem(this.themeStorageKey))
    if (!themeConfig) {
      return
    }

    if (typeof themeConfig === 'string') {
      this._theme.set(themeConfig)
      this._themeOwner.set('User')
      this._chosenTheme.set(themeConfig)
      return
    }

    const owner: ThemeOwner = themeConfig.themeOwner ?? 'OS'
    const savedTheme: Theme = themeConfig.theme ?? this.getOsDefaultTheme

    if (owner === 'OS') {
      this._themeOwner.set('OS')
      this._theme.set(this.getOsDefaultTheme)
      this._chosenTheme.set('OS')
      return
    }

    this._themeOwner.set('User')
    this._theme.set(savedTheme)
    this._chosenTheme.set(savedTheme)
  }

  private clearThemeConfig(): void {
    localStorage.removeItem(this.themeStorageKey)
  }

  private hasSavedThemeConfig(): boolean {
    return !!this.deserializeThemeConfig(localStorage.getItem(this.themeStorageKey))
  }

  private deserializeThemeConfig(raw: string | null): { theme: Theme | null, themeOwner: ThemeOwner, isEnabled: boolean } | Theme | null {
    if (!raw) {
      return null
    }

    // New JSON format
    try {
      const parsed = JSON.parse(raw)
      if (typeof parsed === 'object' && parsed !== null) {
        const theme = parsed.theme === 'dark' || parsed.theme === 'light' ? parsed.theme : null
        const themeOwner: ThemeOwner = parsed.themeOwner === 'User' ? 'User' : 'OS'
        const isEnabled = parsed.isEnabled !== false
        return { theme, themeOwner, isEnabled }
      }
    } catch {
      // Fallback to legacy value
    }

    // Legacy raw string
    return raw === 'dark' || raw === 'light' ? raw : null
  }

  getOsDarkModeMediaQuery(): MediaQueryList {
    return window.matchMedia('(prefers-color-scheme: dark)')
  }
}
