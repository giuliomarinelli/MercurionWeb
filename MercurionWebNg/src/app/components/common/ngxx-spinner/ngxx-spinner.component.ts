import { Component, Input, OnInit } from '@angular/core';
import { ThemeManagerService } from '../../../services/stores/theme-manager.service';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { LoadingContextService } from '../../../services/stores/loading-context.service';

@Component({
  selector: 'app-ngxx-spinner',
  imports: [NgxSpinnerModule],
  templateUrl: './ngxx-spinner.component.html',
  styleUrl: './ngxx-spinner.component.css'
})
export class NgxxSpinnerComponent implements OnInit {

  constructor(
    private readonly themeManager: ThemeManagerService,
    private readonly spinner: NgxSpinnerService,
    protected readonly loadingContext: LoadingContextService
  ) { }

  private darkThemeColor: string = '#60A5FA'
  private lightThemeColor: string = '#2563EB'

  @Input() isLoading: boolean = true
  @Input() isGlobal: boolean = true

  ngOnInit(): void {
    queueMicrotask(() =>
      this.spinner.show('globalSpinner', {
        type: 'ball-atom',
        size: 'medium',
        bdColor: 'rgba(0, 0, 0, 0.6)',
        color: this.themeManager.theme() === 'light' ? this.lightThemeColor : this.darkThemeColor,
      })
    )
    // setTimeout(() => this.isLoading = false, 5000)
  }

}
