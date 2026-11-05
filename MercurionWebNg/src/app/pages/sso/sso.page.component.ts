import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  AfterViewInit,
  inject,
  signal,
  effect,
  viewChild,
} from '@angular/core'
import { ProgressIndicatorComponent } from '../../components/common/progress-indicator/progress-indicator.component'
import { EMPTY, Subscription, switchMap, defer, from, combineLatest, catchError, take } from 'rxjs'
import { ActivatedRoute, Router } from '@angular/router'
import { TypeGuardsService } from '../../services/type-guards.service'
import { FingerprintService } from '../../services/fingerprint.service'
import { AuthTransportService } from '../../services/auth-transport.service'
import { SessionSyncService } from '../../services/session-sync.service'
import { AuthStateStore } from '../../services/auth-state.store'
import { SidenavContextService } from '../../services/context/sidenav-context.service'
import { AuthRedirectService } from '../../services/auth-redirect.service'
import { ViewportRuntimeService } from '../../services/context/viewport-runtime.service'

@Component({
  selector: 'm-sso-page',
  imports: [ProgressIndicatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `

    <div #mainHost class="main-container h-full" role="main" aria-busy="true" aria-live="polite">
      <div class="fixed inset-0 pointer-events-none">
        <div
          class="fixed top-1/2 -translate-y-1/2"
          [style.left.px]="spinnerLeft()"
          role="status"
        >
          <m-progress-indicator />
        </div>
      </div>
    </div>

  `
})
export class SsoPageComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly destroyRef = inject(DestroyRef)
  private readonly redirects = inject(AuthRedirectService)

  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly typeGuards = inject(TypeGuardsService)
  private readonly fingerprintService = inject(FingerprintService)
  private readonly authService = inject(AuthTransportService)
  private readonly sessionSync = inject(SessionSyncService)
  private readonly authState = inject(AuthStateStore)
  private readonly sidenavContext = inject(SidenavContextService)
  private readonly viewportRuntime = inject(ViewportRuntimeService)

  private sub?: Subscription
  private resizeObs?: ResizeObserver
  private spinnerFollowRaf?: number

  spinnerLeft = signal<number>(0)

  readonly mainHost = viewChild<ElementRef<HTMLElement>>('mainHost')

  constructor() {
    effect(() => {
      // riallinea lo spinner quando cambia la sidebar
      const _ = this.sidenavContext.isOpen()
      this.viewportRuntime.width()
      this.viewportRuntime.height()
      queueMicrotask(() => {
        if (this.destroyRef.destroyed) {
          return
        }
        this.updateSpinnerLeft()
        this.startSpinnerFollow()
      })
    })
  }

  ngOnInit(): void {
    this.sub = combineLatest([this.route.queryParamMap, this.route.fragment])
      .pipe(
        take(1),
        switchMap(([params, fragment]) => {
          const provider = params.get('provider') ?? ''
          const token = new URLSearchParams(fragment ?? '').get('t') ?? ''

          if (
            !this.typeGuards.is_SSO_AuthProvider(provider) ||
            !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)
          ) {
            void this.router.navigateByUrl('/404-not-found')
            return EMPTY
          }

          if (location.hash) {
            history.replaceState(history.state, '', location.pathname + location.search)
          }

          return defer(() => from(this.fingerprintService.getSanitizedFingerprint())).pipe(
            switchMap((fingerprint) => {
              this.authState.beginAuthentication('sso')
              return this.authService.ssoAuthorizeFlow(
                fingerprint.fingerprintDataEnc,
                btoa(JSON.stringify(fingerprint.sessionDeviceInfo)),
                token,
                provider
              )
            }),
            catchError(() => {
              queueMicrotask(() => {
                if (this.destroyRef.destroyed) {
                  return
                }
                this.redirects.clear()
                void this.router.navigate(['/login'], {
                  queryParams: { err: 'sso_failed', provider },
                })
              })
              return EMPTY
            })
          )
        })
      )
      .subscribe({
        next: (response) => {
          this.authState.activateAuthenticatedSession({
            initials: response.initials ?? 'U',
            accessToken: response.accessToken,
            wsAccessToken: response.ws_accessToken,
          })
          this.sessionSync.resumeSession(response.initials ?? 'U')
          void this.router.navigateByUrl(this.redirects.consume(), { replaceUrl: true })
        },
      })
  }

  ngAfterViewInit(): void {
    this.attachSpinnerTracking()
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe()
    this.resizeObs?.disconnect()
    this.stopSpinnerFollow()
  }

  private attachSpinnerTracking(): void {
    const host = this.mainHost()?.nativeElement
    if (!host) return

    this.updateSpinnerLeft()
    this.resizeObs?.disconnect()
    this.resizeObs = new ResizeObserver(() => this.updateSpinnerLeft())
    this.resizeObs.observe(host)
    this.startSpinnerFollow()
  }

  private updateSpinnerLeft = () => {
    const rect = this.mainHost()?.nativeElement.getBoundingClientRect()
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
