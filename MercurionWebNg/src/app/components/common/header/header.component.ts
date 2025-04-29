import { NgClass, NgOptimizedImage } from '@angular/common';
import { Component, computed, effect, OnDestroy, OnInit, Signal, signal, WritableSignal } from '@angular/core';
import { ThemeManagerService } from '../../../services/stores/theme-manager.service';
import { ThemeChose } from '../../../Models/types/theme-types';
import { DesignService } from '../../../services/design.service';
import { NavComponent } from '../nav/nav.component';

@Component({
  selector: 'app-header',
  imports: [
    NgOptimizedImage,
    NgClass,
    NavComponent
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
    protected readonly themeManager: ThemeManagerService,
    protected readonly designService: DesignService
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

  protected themeMenuOpen: WritableSignal<boolean> = signal(false)
  protected offCanvasMenuOpen: WritableSignal<boolean> = signal(false)

  readonly menuOpenClass: Signal<boolean> = computed(() => this.themeMenuOpen())

  protected toggleThemeMenu(): void {
    this.themeMenuOpen.update(open => !open)
  }

  protected toggleOffCanvasMenu(): void {
    this.offCanvasMenuOpen.update(open => !open)
  }

  protected closeOffCanvasMenu(): void {
    this.offCanvasMenuOpen.set(false)
  }

  protected closeThemeMenu(): void {
    this.themeMenuOpen.set(false)
  }

  protected handleDocumentClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement

    const isInsideThemeMenu = target.closest('.theme-menu-container')
    const isToggleThemeBtn = target.closest('.theme-toggle-button')
    const isInsideOffCanvasMenu = target.closest('.off-canvas-menu-container')
    const isToggleOffCanvasBtn = target.closest('.off-canvas-menu-button')

    if (!isInsideThemeMenu && !isToggleThemeBtn) {
      this.themeMenuOpen.set(false)
    }

    if (!isInsideOffCanvasMenu && !isToggleOffCanvasBtn) {
      this.offCanvasMenuOpen.set(false)
    }
  }

  protected handleEscape = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.themeMenuOpen.set(false)
      this.offCanvasMenuOpen.set(false)
    }
  }

  protected openSearchOverlay(): void {}


  ngOnInit(): void {
    document.addEventListener('click', this.handleDocumentClick, true)
    document.addEventListener('keydown', this.handleEscape, true)
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleDocumentClick, true)
    document.removeEventListener('keydown', this.handleEscape, true)
  }


}
