import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { EMPTY, of, Subscription, switchMap, defer, from, combineLatest, catchError, take, filter } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { TypeGuardsService } from '../../services/type-guards.service';
import { FingerprintService } from '../../services/fingerprint.service';
import { AuthService } from '../../services/auth.service';
import { SessionSyncService } from '../../services/session-sync.service';

@Component({
  selector: 'm-sso-page',
  imports: [ClassicSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `

    <div class="absolute inset-0 flex justify-center items-center">
      <m-classic-spinner [size]="60" />
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

  private sanitizeRedirectTo(raw: string | null | undefined): string | null {
    const v = (raw ?? '').trim()
    if (!v) return null
    if (!v.startsWith('/')) return null
    if (v.startsWith('//')) return null
    return v
  }

  ngOnInit(): void {
    this.sub = of(null).pipe(
      switchMap(() => defer(() => from(this.fingerprintService.getSanitizedFingerprint()))),
      switchMap((fw) =>
        combineLatest([
          of(fw.fingerprintDataEnc),
          of(btoa(JSON.stringify(fw.sessionDeviceInfo))),
          this.route.queryParamMap,
          this.route.fragment,
        ]).pipe(
          filter(([, , , frag]) => typeof frag === 'string' && frag.includes('t=')),
          take(1)
        )
      ),
      switchMap(([fp_enc, di_enc, p, frag]) => {

        const provider = p.get('provider') ?? ''

        // redirect_to may be lost by provider; fallback to sessionStorage if needed
        const redirectTo =
          this.sanitizeRedirectTo(p.get('redirect_to')) ??
          this.sanitizeRedirectTo(sessionStorage.getItem('redirectAfterLogin'))

        // fragment atteso: "t=<token>"
        const sso_pat = frag ? (new URLSearchParams(frag).get('t') ?? '') : ''

        if (this.typeGuards.is_SSO_AuthProvider(provider) && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(sso_pat)) {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { provider },
            replaceUrl: true,
            fragment: undefined
          })

          queueMicrotask(() => {
            if (location.hash) {
              history.replaceState({}, '', location.pathname + location.search)
            }
          })

          localStorage.removeItem('accessToken')
          localStorage.removeItem('ws_accessToken')
          localStorage.removeItem('ws_accessToken_ts')
          localStorage.removeItem('login')
          localStorage.removeItem('scp')
          document.cookie = '__logged_in=; Max-Age=0; path=/'

          return this.authService.sso_authorizeFlow(fp_enc, di_enc, sso_pat, provider).pipe(
            catchError(() => {
              queueMicrotask(() => {
                sessionStorage.removeItem('redirectAfterLogin')
                this.router.navigate(['/login'], { queryParams: { err: 'sso_failed', provider } })
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
