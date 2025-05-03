import { Component, OnInit } from '@angular/core';
import { ThemeManagerService } from '../../../services/stores/theme-manager.service';
import { NgxSpinner, NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-ngxx-spinner',
  imports: [NgxSpinnerModule],
  templateUrl: './ngxx-spinner.component.html',
  styleUrl: './ngxx-spinner.component.css'
})
export class NgxxSpinnerComponent implements OnInit {

  constructor(
    private readonly themeManager: ThemeManagerService,
    private readonly spinner: NgxSpinnerService
  ) { }

  ngOnInit(): void {
    queueMicrotask(() =>
      this.spinner.show('globalSpinner', {
        type: 'ball-atom',
        size: 'large',
        bdColor: 'rgba(0, 0, 0, 0.6)',
        color: '#ffffff'
      })
    )
  }

}
