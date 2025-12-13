import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'm-redirect-to-login-component',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `

    <div class="absolute inset-0">

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
