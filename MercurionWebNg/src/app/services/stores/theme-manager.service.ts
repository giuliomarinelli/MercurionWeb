import { Injectable, signal, computed, effect, WritableSignal } from '@angular/core';
import { Theme, ThemeChose, ThemeOwner } from '../../Models/types/theme-types';

@Injectable({ providedIn: 'root' })
export class ThemeManagerService {
  private readonly _theme = signal<Theme>(this.getOsDefaultTheme)
  private readonly _themeOwner = signal<ThemeOwner>('OS');
  private readonly _chosenTheme = signal<ThemeChose>('OS');

  // Pubblici readonly Signals!
  readonly theme = this._theme.asReadonly();
  readonly themeOwner = this._themeOwner.asReadonly();
  readonly chosenTheme = this._chosenTheme.asReadonly();

  // Computed signals utili per il template
  readonly isLightUserTheme = computed(() => this._theme() === 'light' && this._themeOwner() === 'User');
  readonly isDarkUserTheme = computed(() => this._theme() === 'dark' && this._themeOwner() === 'User');
  readonly isOsLightTheme = computed(() => this._theme() === 'light' && this._themeOwner() === 'OS');
  readonly isOsDarkTheme = computed(() => this._theme() === 'dark' && this._themeOwner() === 'OS');

  constructor() {
    this.initTheme();

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
  set chooseTheme(chosen: ThemeChose) {
    this._chosenTheme.set(chosen);
    this._themeOwner.set(chosen === 'OS' ? 'OS' : 'User');

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

  private initTheme(): void {
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
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark')
      root.setAttribute('data-theme', 'dark')
    } else {
      root.classList.remove('dark')
      root.removeAttribute('data-theme')
    }
  }

  private saveThemeConfig(theme: Theme): void {
    localStorage.setItem('__tw_mat_theme', theme)
  }

  private restoreThemeConfig(): void {
    const themeConfig = localStorage.getItem('__tw_mat_theme') as Theme | null
    if (themeConfig === 'dark' || themeConfig === 'light') {
      this._theme.set(themeConfig)
      this._themeOwner.set('User')
    }
  }

  private clearThemeConfig(): void {
    localStorage.removeItem('__tw_mat_theme')
  }

  private hasSavedThemeConfig(): boolean {
    return !!localStorage.getItem('__tw_mat_theme')
  }

  getOsDarkModeMediaQuery(): MediaQueryList {
    return window.matchMedia('(prefers-color-scheme: dark)')
  }
}
