import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core'
import type { SSO_AuthProvider } from '@mercurion/rest-contracts'
import type { LoginSsoSelection } from './login-flow.models'

@Component({
  selector: 'm-login-sso-chooser',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="sso-title">
      <h2 id="sso-title">Oppure</h2>
      @for (provider of providers; track provider) {
        <a [href]="hrefFor(provider)" [attr.aria-label]="'Continua con ' + provider">
          Continua con {{ provider }}
        </a>
      }
    </section>
  `,
  styles: [`
    :host { display: block; }
    section { display: grid; gap: .75rem; }
    a { width: 100%; padding: .55rem; border-radius: .375rem; }
  `]
})
export class LoginSsoChooserComponent {
  @Input() redirectTo: string | null = null
  @Output() readonly providerSelected = new EventEmitter<LoginSsoSelection>()

  readonly providers: readonly SSO_AuthProvider[] = ['Google', 'GitHub', 'Discord']

  hrefFor(provider: SSO_AuthProvider): string {
    const query = this.redirectTo ? `?redirect_to=${encodeURIComponent(this.redirectTo)}` : ''
    return `/api/oauth2/sso/${provider}/login${query}`
  }

  select(provider: SSO_AuthProvider): void {
    this.providerSelected.emit({ provider, redirectTo: this.redirectTo })
  }
}
