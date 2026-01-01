import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClassicSpinnerComponent } from '../classic-spinner/classic-spinner.component';

@Component({
  selector: 'm-redirect-to-login-component',
  imports: [ClassicSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `

    <div class="absolute inset-0 text-light-on-surface-main dark:text-dark-on-surface-main flex justify-center items-center h-full" role="status" aria-live="assertive">
      <m-classic-spinner [size]="60" ariaLabel="Reindirizzamento alla pagina di login in corso." />
    </div>

  `
})
export class RedirectToLoginComponent implements OnInit {

  private readonly router = inject(Router)

  ngOnInit(): void {
    this.router.navigate(['/login'], {
      queryParams: {
        redirected: true
      }
    })
  }

}
