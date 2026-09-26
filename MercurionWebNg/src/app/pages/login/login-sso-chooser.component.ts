import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { SSO_AuthProvider } from '@mercurion/rest-contracts'
import type { LoginSsoSelection } from './login-flow.models'

@Component({
  selector: 'm-login-sso-chooser',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <section aria-labelledby="sso-title" class="space-y-5 dark:text-slate-100">
      @for (provider of providers; track provider) {
        <a
          [href]="hrefFor(provider)"
          class="flex w-full items-center justify-center gap-3 rounded-md border border-light-accent-primary-hc dark:border-slate-50 text-light-accent-primary-hc dark:text-slate-50 py-2.5 text-sm transition-colors duration-150 hover:bg-accent-primary hover:text-slate-50 dark:bg-transparent dark:hover:bg-slate-100 dark:hover:text-neutral-900"
          [attr.aria-label]="'Continua con ' + provider"
        >
          @switch (provider) {
            @case ('Google') {
              <svg class="h-5 w-auto fill-current" viewBox="0 0 488 512" aria-hidden="true">
                <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/>
              </svg>
            }
            @case ('ORCID') {
              <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>
                <text x="12" y="15" text-anchor="middle" font-size="8" font-weight="700" fill="currentColor">iD</text>
              </svg>
            }
            @case ('Discord') {
              <svg class="h-5 w-auto fill-current" viewBox="0 0 640 640" aria-hidden="true">
                <path d="M524.5 133.8A409.7 409.7 0 0 0 404 96a319 319 0 0 0-16.8 31.5 440 440 0 0 0-134.4 0A319 319 0 0 0 235.8 96a409.7 409.7 0 0 0-119.7 37C39.9 246.8 19 357.9 29.1 469.6A486 486 0 0 0 175.9 543.8a352 352 0 0 0 32.2-50.3 286 286 0 0 1-47.1-23.7l9.8-10.6c96.2 43.9 200.4 43.9 296.5.1l11 10.5a286 286 0 0 1-47.1 23.7 352 352 0 0 0 30.1 50.3 486 486 0 0 0 149.1-74.2c12.2-128.2-20.6-238.3-85.9-335.8zM222.5 401.5c-29 0-52.8-26.6-52.8-59.2s23.4-59.2 52.8-59.2 53.3 26.8 52.8 59.2c0 32.7-23.4 59.2-52.8 59.2zm195.4 0c-29 0-52.8-26.6-52.8-59.2s23.4-59.2 52.8-59.2 53.3 26.8 52.8 59.2c0 32.7-23.2 59.2-52.8 59.2z"/>
              </svg>
            }
          }
          <span>Continua con {{ provider }}</span>
        </a>
      }
    </section>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class LoginSsoChooserComponent {

  readonly redirectTo = input<string | null>(null)
  readonly providers: readonly SSO_AuthProvider[] = ['Google', 'ORCID', 'Discord']

  hrefFor(provider: SSO_AuthProvider): string {
    const redirectTo = this.redirectTo()
    const query = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : ''
    return `/api/oauth2/sso/${provider}/login${query}`
  }

  select(provider: SSO_AuthProvider): LoginSsoSelection {
    return { provider, redirectTo: this.redirectTo() }
  }
}
