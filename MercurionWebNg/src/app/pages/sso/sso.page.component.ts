import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  AfterViewInit,
  inject,
  signal,
  effect,
} from '@angular/core';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { EMPTY, of, Subscription, switchMap, defer, from, combineLatest, catchError, take, filter } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { TypeGuardsService } from '../../services/type-guards.service';
import { FingerprintService } from '../../services/fingerprint.service';
import { AuthService } from '../../services/auth.service';
import { SessionSyncService } from '../../services/session-sync.service';
import { AuthStateStore } from '../../services/auth-state.store'
import { SidenavContextService } from '../../services/context/sidenav-context.service';

@Component({
  selector: 'm-sso-page',
  imports: [ClassicSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `

    <div #mainHost class="main-container h-full" role="main" aria-busy="true" aria-live="polite">
      <div class="fixed inset-0 pointer-events-none">
        <div
          class="fixed top-1/2 -translate-y-1/2"
          [style.left.px]="spinnerLeft()"
          role="status"
        >
          <m-classic-spinner [size]="60" />
        </div>
      </div>
    </div>

  `
})
export class SsoPageComponent implements OnInit, OnDestroy, AfterViewInit {

  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly typeGuards = inject(TypeGuardsService)
  private readonly fingerprintService = inject(FingerprintService)
  private readonly authService = inject(AuthService)
  private readonly sessionSync = inject(SessionSyncService)
  private readonly authState = inject(AuthStateStore)
  private readonly sidenavContext = inject(SidenavContextService)

  private sub?: Subscription
  private resizeObs?: ResizeObserver
  private spinnerFollowRaf?: number

  spinnerLeft = signal<number>(0)

  @ViewChild('mainHost', { static: true }) mainHost?: ElementRef<HTMLElement>

  constructor() {
    effect(() => {
      // riallinea lo spinner quando cambia la sidebar
      const _ = this.sidenavContext.isOpen()
      queueMicrotask(() => {
        this.updateSpinnerLeft()
        this.startSpinnerFollow()
      })
    })
  }

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

          this.authState.logout()

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
        this.authState.completeAuthentication({
          initials: res.initials ?? 'U',
          accessToken: res.accessToken,
          wsAccessToken: res.ws_accessToken,
          scopes: res.accessToken ? this.authService.getUserScopesFromClaims(res.accessToken) : []
        })
        this.sessionSync.resumeSession(res.initials ?? 'U')
        const redirect = sessionStorage.getItem('redirectAfterLogin') || '/dashboard'
        this.router.navigateByUrl(redirect)
      }
    })
  }

  ngAfterViewInit(): void {
    this.attachSpinnerTracking()
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe()
    this.resizeObs?.disconnect()
    window.removeEventListener('resize', this.updateSpinnerLeft)
    this.stopSpinnerFollow()
  }

  private attachSpinnerTracking(): void {
    const host = this.mainHost?.nativeElement
    if (!host) return

    this.updateSpinnerLeft()
    this.resizeObs?.disconnect()
    this.resizeObs = new ResizeObserver(() => this.updateSpinnerLeft())
    this.resizeObs.observe(host)
    window.addEventListener('resize', this.updateSpinnerLeft)
    this.startSpinnerFollow()
  }

  private updateSpinnerLeft = () => {
    const rect = this.mainHost?.nativeElement.getBoundingClientRect()
    if (!rect) return
    this.spinnerLeft.set(rect.left + rect.width / 2)
  }

  private startSpinnerFollow(): void {
    this.stopSpinnerFollow()
    const start = performance.now()
    const step = (now: number) => {
      this.updateSpinnerLeft()
      if (now - start < 800) {
        this.spinnerFollowRaf = requestAnimationFrame(step)
      }
    }
    this.spinnerFollowRaf = requestAnimationFrame(step)
  }

  private stopSpinnerFollow(): void {
    if (this.spinnerFollowRaf) {
      cancelAnimationFrame(this.spinnerFollowRaf)
      this.spinnerFollowRaf = undefined
    }
  }

}
