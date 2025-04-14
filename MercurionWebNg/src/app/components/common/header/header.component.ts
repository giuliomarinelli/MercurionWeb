import { NgClass, NgOptimizedImage } from '@angular/common';
import { Component, computed, effect, OnDestroy, OnInit, Signal, signal, WritableSignal } from '@angular/core';
import { ThemeManagerService } from '../../../services/stores/theme-manager.service';
import { ThemeChose } from '../../../Models/types/theme-types';

@Component({
  selector: 'app-header',
  imports: [
    NgOptimizedImage,
    NgClass
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {

  // Signals derivati per logoSrc e titleSrc
  readonly logoSrc = computed(() =>
    this.themeManager.theme() === 'light' ? 'logo-png/flame-for-light-theme.png' : 'logo-png/flame-red-for-dark-theme.png'
  )

  readonly titleSrc = computed(() =>
    this.themeManager.theme() === 'light' ? '/logo/complete-light-logo.svg' : '/logo/complete-dark-logo-2.svg'
  )

  constructor(
    protected readonly themeManager: ThemeManagerService
  ) {
    effect(() => {
      // Reactive logging/debugging se vuoi
      // console.log('Tema attuale:', this.themeManager.theme())
      // console.log(this.titleSrc())
    })
  }

  protected onThemeChange(theme: ThemeChose): void {
    queueMicrotask(() => {
      this.themeManager.chooseTheme(theme)
      console.log(this.themeManager.theme())
    })
  }

  protected menuOpen: WritableSignal<boolean> = signal(false)

  readonly menuOpenClass: Signal<boolean> = computed(() => this.menuOpen())

  protected toggleMenu(): void {
    console.log('Toggle menu triggered 🚀')
    this.menuOpen.update(open => {
      console.log('Current menu state:', open)
      return !open
    })
  }

  protected closeMenu(): void {
    this.menuOpen.set(false)
  }

  protected handleDocumentClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement

    const isInsideMenu = target.closest('.theme-menu-container')
    const isToggleBtn = target.closest('.theme-toggle-button') // aggiungi questa classe al bottone toggle

    if (!isInsideMenu && !isToggleBtn) {
      this.menuOpen.set(false)
    }
  }

  protected handleEscape = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.menuOpen.set(false)
    }
  }


  ngOnInit(): void {
    document.addEventListener('click', this.handleDocumentClick, true)
    document.addEventListener('keydown', this.handleEscape, true)
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleDocumentClick, true)
    document.removeEventListener('keydown', this.handleEscape, true)
  }


}
