import { Component, effect, Input, OnInit } from '@angular/core';
import { ThemeManagerService } from '../../../services/stores/theme-manager.service';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { LoadingContextService } from '../../../services/stores/loading-context.service';

@Component({
  selector: 'app-ngxx-spinner',
  imports: [NgxSpinnerModule],
  templateUrl: './ngxx-spinner.component.html',
  styleUrl: './ngxx-spinner.component.css'
})
export class NgxxSpinnerComponent {

  private lightThemeColor: string = '#2563EB'
  private darkThemeColor: string = '#60A5FA'

  constructor(
    private readonly themeManager: ThemeManagerService,
    private readonly spinner: NgxSpinnerService,
    protected readonly loadingContext: LoadingContextService
  ) {
    effect(() => {
      const bdColor = `rgba(0, 0, 0, ${this.themeManager.theme() === 'light' ? '0.25' : '0.625'})`
      this.spinner.show('globalSpinner', {
        type: 'ball-atom',
        size: 'medium',
        bdColor,
        color: this.themeManager.theme() === 'light' ? this.lightThemeColor : this.darkThemeColor,
      })
    })
  }

}
