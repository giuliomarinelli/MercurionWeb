import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { EMPTY, of, Subscription, switchMap, defer, from, combineLatest, catchError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { TypeGuardsService } from '../../services/type-guards.service';
import { FingerprintService } from '../../services/fingerprint.service';
import { AuthService } from '../../services/auth.service';
import { SessionSyncService } from '../../services/session-sync.service';

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

  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly typeGuards = inject(TypeGuardsService)
  private readonly fingerprintService = inject(FingerprintService)
  private readonly authService = inject(AuthService)
  private readonly sessionSync = inject(SessionSyncService)

  private sub?: Subscription

  ngOnInit(): void {
    this.sub = of(null).pipe(
      switchMap(() => defer(() => from(this.fingerprintService.getSanitizedFingerprint()))),
      switchMap((fw) => combineLatest([of(fw.fingerprintDataEnc), of(btoa(JSON.stringify(fw.sessionDeviceInfo))), this.route.queryParamMap])),
      switchMap(([fp_enc, di_enc, p]) => {
        const sso_pat = p.get('t') ?? ''
        const provider = p.get('provider') ?? ''
        if (this.typeGuards.is_SSO_AuthProvider(provider) && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(sso_pat)) {
          history.replaceState({}, '', location.pathname + '?provider=' + provider)
          localStorage.removeItem('accessToken')
          localStorage.removeItem('ws_accessToken')
          localStorage.removeItem('ws_accessToken_ts')
          localStorage.removeItem('login')
          document.cookie = '__logged_in=; Max-Age=0; path=/'
          return this.authService.sso_authorizeFlow(fp_enc, di_enc, sso_pat, provider).pipe(
            catchError(() => {
              queueMicrotask(() => {
                sessionStorage.removeItem('redirectAfterLogin')
                this.router.navigate(['/login'], {
                  queryParams: {
                    err: 'sso_failed',
                    provider
                  }
                })
              })
              return EMPTY
            })
          )
        }
        this.router.navigateByUrl('/404-not-found')
        return EMPTY
      })
    ).subscribe({
      next: (res) => {
        this.authService.setAccessToken(res.accessToken)
        this.authService.setWs_accessToken(res.ws_accessToken)
        localStorage.setItem('login', res.initials ?? 'U')
        this.sessionSync.resumeSession(res.initials ?? 'U')
        const redirect = sessionStorage.getItem('redirectAfterLogin') || '/dashboard'
        this.router.navigateByUrl(redirect)
      }
    })
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe()
  }

}
