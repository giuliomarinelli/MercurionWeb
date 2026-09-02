import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClassicSpinnerComponent } from '../classic-spinner/classic-spinner.component';
import { DesignService } from '../../../services/design.service';

@Component({
  selector: 'm-redirect-to-login-component',
  imports: [ClassicSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `

    <div class="absolute inset-0 text-light-on-surface-main dark:text-dark-on-surface-main flex justify-center items-center h-full" role="status" aria-live="assertive">
      @if (design.maxBk('md')()) {
        <m-classic-spinner [size]="30" ariaLabel="Reindirizzamento alla pagina di login in corso." />
      } @else if (design.minBk('md')()) {
        <m-classic-spinner [size]="60" ariaLabel="Reindirizzamento alla pagina di login in corso." />
      }
    </div>

  `
})
export class RedirectToLoginComponent implements OnInit {

  private readonly router = inject(Router)
  protected readonly design = inject(DesignService)

  ngOnInit(): void {
    this.router.navigate(['/login'], {
      queryParams: {
        redirected: true
      }
    })
  }

}
