import { Component, OnDestroy, OnInit } from '@angular/core';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'm-sso-page',
  imports: [ClassicSpinnerComponent],
  template: `

    <div class="absolute inset-0 flex justify-center items-center">
      <app-classic-spinner [size]="60" />
    </div>

  `
})
export class SsoPageComponent implements OnInit, OnDestroy {

  private sub?: Subscription

  ngOnInit(): void {

  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe()
  }

}
