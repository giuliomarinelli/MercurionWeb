import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { SSO_AuthProvider } from '@mercurion/rest-contracts'
import type { LoginSsoSelection } from './login-flow.models'

@Component({
  selector: 'm-login-sso-chooser',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section aria-labelledby="sso-title" class="space-y-3 dark:text-slate-100">
      <div class="relative py-2">
        <div class="absolute inset-0 flex items-center"><div class="w-full border-t"></div></div>
        <div class="relative flex justify-center text-sm">
          <h2 id="sso-title" class="bg-light-surface-main px-2 text-gray-500 dark:bg-neutral-950 dark:text-slate-300">OPPURE</h2>
        </div>
      </div>
      @for (provider of providers; track provider) {
        <a
          [href]="hrefFor(provider)"
          class="flex w-full items-center justify-center gap-3 rounded-md border bg-slate-200 py-2.5 text-sm transition-colors duration-150 hover:bg-slate-200/80 dark:bg-transparent dark:hover:bg-slate-100 dark:hover:text-neutral-900"
          [attr.aria-label]="'Continua con ' + provider"
        >
          @switch (provider) {
            @case ('Google') {
              <svg class="h-5 w-auto fill-current" viewBox="0 0 488 512" aria-hidden="true">
                <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/>
              </svg>
            }
            @case ('GitHub') {
              <svg class="h-[26px] w-auto fill-current" viewBox="0 0 640 640" aria-hidden="true">
                <path d="M320 72C181.3 72 72 177.3 72 316c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4-70 15-84.7-29.8-84.7-29.8-11.4-29.1-27.8-36.6-27.8-36.6-22.9-15.7 1.6-15.4 1.6-15.4 24.9 2 38.6 25.8 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 40-10 85.6-10 125.6 0 0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C500.2 521.8 568 426.9 568 316 568 177.3 458.7 72 320 72z"/>
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
      <div class="mt-4 text-center text-xs text-gray-400">
        <a routerLink="/privacy" class="hover:underline">Informativa sulla Privacy</a>
        ·
        <a routerLink="/terms-and-policies" class="hover:underline">Termini e Policy</a>
      </div>
      <p class="text-center text-[0.675rem] text-slate-600 dark:text-slate-300">
        Continuando con un provider dichiari di aver letto e di accettare la
        <a routerLink="/privacy" class="underline">Informativa sulla Privacy</a>,
        i <a routerLink="/terms-and-policies" class="underline">Termini di Servizio</a>
        e la <a routerLink="/terms-and-policies" fragment="aup" class="underline">Politica di Utilizzo Accettabile</a>.
      </p>
    </section>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class LoginSsoChooserComponent {
  readonly redirectTo = input<string | null>(null)
  readonly providers: readonly SSO_AuthProvider[] = ['Google', 'GitHub', 'Discord']

  hrefFor(provider: SSO_AuthProvider): string {
    const redirectTo = this.redirectTo()
    const query = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : ''
    return `/api/oauth2/sso/${provider}/login${query}`
  }

  select(provider: SSO_AuthProvider): LoginSsoSelection {
    return { provider, redirectTo: this.redirectTo() }
  }
}
