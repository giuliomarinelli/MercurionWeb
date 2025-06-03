import { NgOptimizedImage } from '@angular/common';
import { Component, effect, signal } from '@angular/core';
import { ThemeManagerService } from '../../../services/stores/theme-manager.service';
import { PublicPipe } from '../../../pipes/public.pipe';

@Component({
  selector: 'app-footer',
  imports: [NgOptimizedImage, PublicPipe],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {

  protected logoSrc = signal<string>('')

  constructor(private readonly themeManager: ThemeManagerService) {
    effect(() => this.logoSrc.set(this.themeManager.theme() === 'dark' ? 'logo/pictogram-dark-logo-2.svg' : 'logo/pictogram-light-logo.svg'))
  }

}
