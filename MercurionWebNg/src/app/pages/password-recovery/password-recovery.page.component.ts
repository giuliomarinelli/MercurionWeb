import { ButtonPendingContentComponent } from '../../components/common/button/button-pending-content.component'
import { LoggerService } from '../../services/logger.service'
import {
  afterNextRender,
  ElementRef,
  Injector,
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { AccountService } from '../../services/account.service'
import { catchError, EMPTY, of, Subscription, switchMap, take, tap } from 'rxjs'
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { TextFieldComponent } from '../../components/common/text-field/text-field.component'
import { ProgressIndicatorComponent } from '../../components/common/progress-indicator/progress-indicator.component'
import { matchPassword } from '../../custom-validators'
import { ErrorRes } from '../../Models/confirm.models'
import { UserContextService } from '../../services/context/user-context.service'
import { Helpers } from '../../helpers'
import { ApplicationErrorCode, hasApplicationErrorCode } from '../../utils/application-error.util'

@Component({
  selector: 'm-password-recovery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonPendingContentComponent,
    ReactiveFormsModule,
    TextFieldComponent,
    ProgressIndicatorComponent,
    RouterLink,
  ],
  template: `
    <main
      class="auth-page"
      aria-labelledby="password-recovery-title"
      [attr.aria-busy]="(!canView() && !linkError()) || step_12_loading()"
    >
      <div class="auth-container">
        <a routerLink="/login" class="auth-link mb-3">
          <span aria-hidden="true">←</span>
          Torna all’accesso
        </a>
        <section class="auth-card">
          <header class="auth-header">
            <div>
              <h1 id="password-recovery-title" class="auth-title">Scegli una nuova password</h1>
              <p class="auth-description">Reimposta la password del tuo account Mercurion.</p>
            </div>
          </header>
          @if (linkError()) {
            <div class="auth-stack">
              <p class="auth-error" role="alert">
                Il link non è valido, è scaduto o non è stato possibile verificarlo. Richiedi un
                nuovo link per continuare.
              </p>
              <a routerLink="/forgot-password" class="auth-option">Richiedi un nuovo link</a>
            </div>
          } @else if (!canView()) {
            <div class="auth-status" role="status">
              <m-progress-indicator [size]="24" />
              <p>Verifica del link in corso…</p>
            </div>
          } @else if (step() === 1) {
            <form
              class="auth-form"
              (ngSubmit)="send()"
              [formGroup]="form"
              aria-labelledby="password-recovery-title"
            >
              <div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 640 640"
                  class="fill-current size-16 shrink-0"
                  aria-hidden="true"
                >
                  <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                  <path
                    d="M320 96C443.7 96 544 196.3 544 320C544 443.7 443.7 544 320 544C196.3 544 96 443.7 96 320C96 196.3 196.3 96 320 96zM320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM272 416L256 416L256 448L384 448L384 416L336 416L336 288L256 288L256 320L304 320L304 416L272 416zM344 248L344 200L296 200L296 248L344 248z"
                  />
                </svg>
                <p class="auth-description auth-flow-copy">
                  Almeno 8 caratteri, con una maiuscola, una minuscola, un numero e un carattere
                  speciale.
                </p>
              </div>
              <fieldset class="auth-fields" [disabled]="step_12_loading() || serverError()">
                <m-text-field
                  label="Nuova password"
                  type="password"
                  autocomplete="new-password"
                  formControlName="password"
                  [errors]="{
                    required: 'Campo obbligatorio.',
                    pattern:
                      'Usa almeno 8 caratteri con una maiuscola, una minuscola, un numero e un carattere speciale.',
                  }"
                />
                <m-text-field
                  label="Conferma password"
                  type="password"
                  autocomplete="new-password"
                  formControlName="confirmPassword"
                  [errors]="{
                    required: 'Campo obbligatorio.',
                    matchPassword: 'Le due password non corrispondono.',
                  }"
                />
              </fieldset>
              @if (serverError()) {
                <p class="auth-error" role="alert">
                  {{ serverErrorMsg() }}. Tra pochi secondi tornerai alla richiesta di recupero.
                </p>
                <a routerLink="/forgot-password" class="auth-link">Richiedi subito un nuovo link</a>
              }
              <button
                type="submit"
                class="auth-submit"
                [disabled]="form.invalid || step_12_loading() || serverError()"
                [attr.aria-busy]="step_12_loading()"
                aria-label="Conferma nuova password"
              >
                <m-button-pending-content [pending]="step_12_loading()">
                  Cambia password
                </m-button-pending-content>
              </button>
            </form>
          } @else {
            <div class="auth-stack" role="status">
              <div class="flex flex-col items-start gap-4 sm:flex-row">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 640 640"
                  class="fill-current size-16 shrink-0 text-emerald-800 dark:text-emerald-400"
                  aria-hidden="true"
                >
                  <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                  <path
                    d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 96C196.3 96 96 196.3 96 320C96 443.7 196.3 544 320 544C443.7 544 544 443.7 544 320C544 196.3 443.7 96 320 96zM438.3 236.5L428.9 249.4L300.9 425.4L289.9 440.6L201.3 352L223.9 329.4L286 391.5L403 230.7L412.4 217.8L438.3 236.6z"
                  />
                </svg>
                <div class="grid min-w-0 gap-2">
                  <h2 #stateHeading tabindex="-1" class="auth-section-title">
                    Password aggiornata
                  </h2>
                  <p class="auth-description auth-flow-copy">
                    La password è stata cambiata con successo. Ora puoi accedere con la nuova
                    password.
                  </p>
                </div>
              </div>
              <a routerLink="/login" class="auth-option">Vai all’accesso</a>
            </div>
          }
        </section>
      </div>
    </main>
  `,
  styleUrls: ['../login/auth-entry.css', '../login/account-flow.css'],
})
export class PasswordRecoveryPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly accountService = inject(AccountService)
  private readonly fb = inject(NonNullableFormBuilder)
  private readonly userCtx = inject(UserContextService)
  private readonly destroyRef = inject(DestroyRef)
  private readonly injector = inject(Injector)
  private readonly stateHeading = viewChild<ElementRef<HTMLElement>>('stateHeading')

  private focusState(): void {
    afterNextRender(() => this.stateHeading()?.nativeElement.focus({ preventScroll: true }), {
      injector: this.injector,
    })
  }

  private readonly logger = inject(LoggerService)

  private changePasswordToken = signal<string>('')
  private recoverySub?: Subscription
  private paramSub?: Subscription
  private sendSub?: Subscription
  private valChSub?: Subscription
  private valChSub2?: Subscription
  private redirectTimeoutId?: ReturnType<typeof setTimeout>

  step = signal<1 | 2>(1)
  canView = signal(false)
  linkError = signal(false)
  step_12_loading = signal<boolean>(false)
  serverError = signal<boolean>(false)
  serverErrorMsg = signal<string>('Si è verificato un errore')

  form = this.fb.group({
    password: [
      '',
      [
        Validators.required,
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/),
      ],
    ],
    confirmPassword: ['', [Validators.required, matchPassword]],
  })

  private sanitizeToken(raw: string) {
    return decodeURIComponent(raw).replace(/[\s\u00A0\u200B-\u200D\uFEFF]/g, '')
  }

  ngOnInit(): void {
    this.valChSub = this.form
      .get('password')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.form.get('confirmPassword')?.updateValueAndValidity({ onlySelf: true })
      })
    this.valChSub2 = this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.serverError.set(false))
    this.recoverySub = of(null)
      .pipe(
        tap(() => {
          this.userCtx.logout()
        }),
        switchMap(() =>
          this.route.fragment.pipe(
            take(1),
            switchMap((frag) => {
              const raw = new URLSearchParams(frag ?? '').get('t') ?? ''
              const t = this.sanitizeToken(raw)

              if (!t || !Helpers.isValidJwt(t)) {
                this.linkError.set(true)
                return EMPTY
              }

              this.changePasswordToken.set(t)

              this.router.navigate([], {
                relativeTo: this.route,
                replaceUrl: true,
                fragment: undefined,
              })

              queueMicrotask(() => {
                if (!this.destroyRef.destroyed && location.hash) {
                  history.replaceState({}, '', location.pathname + location.search)
                }
              })

              return of(t)
            })
          )
        ),
        switchMap((t) =>
          this.accountService.isAuthorizedToRecoverPassword(t).pipe(
            take(1),
            switchMap((ok) => {
              if (!ok) {
                this.linkError.set(true)
                return EMPTY
              }
              this.canView.set(true)
              return EMPTY
            }),
            catchError(() => {
              this.linkError.set(true)
              return EMPTY
            })
          )
        ),
        catchError(() => {
          this.linkError.set(true)
          return EMPTY
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe()
  }

  send(): void {
    if (this.step_12_loading()) {
      return
    }
    this.form.markAllAsTouched()
    if (this.form.valid) {
      this.step_12_loading.set(true)
      this.sendSub = this.accountService
        .recoverPassword(
          { newPassword: this.form.controls['password'].value! },
          this.changePasswordToken()
        )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.step.set(2)
            this.focusState()
            this.step_12_loading.set(false)
          },
          error: (e: { error: ErrorRes; status: number }) => {
            this.logger.error('Password recovery error', e)
            this.serverError.set(true)
            this.step_12_loading.set(false)
            if (
              e.status === 403 &&
              hasApplicationErrorCode(e.error, ApplicationErrorCode.PASSWORD_REUSED)
            ) {
              this.serverErrorMsg.set('Impossibile salvare una password già utilizzata')
            }
            clearTimeout(this.redirectTimeoutId)
            this.redirectTimeoutId = setTimeout(
              () => this.router.navigateByUrl('/forgot-password'),
              3000
            )
          },
        })
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.redirectTimeoutId)
    this.recoverySub?.unsubscribe()
    this.paramSub?.unsubscribe()
    this.sendSub?.unsubscribe()
    this.valChSub?.unsubscribe()
    this.valChSub2?.unsubscribe()
  }
}
