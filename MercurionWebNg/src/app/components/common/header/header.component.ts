import { NgOptimizedImage } from '@angular/common';
import { Component, computed, effect, WritableSignal } from '@angular/core';
import { ThemeManagerService } from '../../../services/stores/theme-manager.service';

@Component({
  selector: 'app-header',
  imports: [NgOptimizedImage],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {

  // Signals derivati per logoSrc e titleSrc
  readonly logoSrc = computed(() =>
    this.themeManager.theme() === 'light' ? 'logo-png/flame-for-light-theme.png' : 'logo-png/flame-red-for-dark-theme.png'
  );

  readonly titleSrc = computed(() =>
    this.themeManager.theme() === 'light' ? '/logo/complete-light-logo.svg' : '/logo/complete-dark-logo-2.svg'
  );

  constructor(
    protected readonly themeManager: ThemeManagerService
  ) {
    effect(() => {
      // Reactive logging/debugging se vuoi
      // console.log('Tema attuale:', this.themeManager.theme())
      // console.log(this.titleSrc())
    })
  }

}
