import { MfaStrategy } from './../../../Models/account/account.models';
import { SensitiveDataChangeInnerScope } from './../../../Models/action/action-overlay.models';
import { SensitiveDataChangeContextService } from './../../../services/context/action-context/sensitive-data-change-context.service';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ClassicSpinnerComponent } from '../../common/classic-spinner/classic-spinner.component';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { combineLatest, EMPTY, Observable, of, Subscription, switchMap, tap, finalize } from 'rxjs';
import { AccountService } from '../../../services/account.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../../services/toast.service';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { emailAvailabilityValidator } from '../../../custom-validators';
import { AuthService } from '../../../services/auth.service';
import { PhonePrefixDTO } from '../../../Models/country.models';
import { CountryService } from '../../../services/country.service';
import { MfaStrategyCardComponent } from '../../common/mfa-strategy-card/mfa-strategy-card.component';
import { FloatingInputComponent } from "../../common/floating-input/floating-input.component";


@Component({
  selector: 'm-sensitive-data-change',
  imports: [
    ClassicSpinnerComponent,
    ReactiveFormsModule,
    MfaStrategyCardComponent,
    FloatingInputComponent
  ],
  template: `


<div class="flex justify-center items-center min-h-screen px-2">
  <div class="w-full max-w-5xl bg-white dark:bg-dark-surface-main rounded-xl shadow-lg">

    <!-- Header sticky fuori dallo scroll -->
    <div class="flex items-center justify-between px-4 py-4 border-b border-b-slate-400 sticky top-0 z-50 rounded-t-xl bg-white dark:bg-dark-surface-main">
      <h2 class="text-lg font-semibold">
        @switch(innerScope()) {
            @case ('EnableMfa') {
              Attiva l'autenticazione a più fattori
            }
            @case ('ConfigMfa') {
              Configura l'autenticazione a più fattori
            }
            @case ('ChangeEmail') {
              Modifica l'e-mail
            }
            @case ('ChangePhone') {
              Modifica il numero di telefono
            }
            @case ('AddPhone') {
              Aggiungi un numero di telefono
            }
            @case ('RemovePhone') {
              Rimuovi un numero di telefono
            }
            @case ('ChangePassword') {
              Cambia la password
            }
        }
      </h2>
      <button class="inline-flex items-center justify-center size-8 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-transparent transition" (click)="close()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-5 h-auto">
          <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path d="M182.9 137.4L160.3 114.7L115 160L137.6 182.6L275 320L137.6 457.4L115 480L160.3 525.3L182.9 502.6L320.3 365.3L457.6 502.6L480.3 525.3L525.5 480L502.9 457.4L365.5 320L502.9 182.6L525.5 160L480.3 114.7L457.6 137.4L320.3 274.7L182.9 137.4z"/>
        </svg>
      </button>
    </div>
    <!-- Body -->
    <div class="py-6 px-3 overflow-y-auto flex flex-col gap-4 min-h-[60vh] max-h-[60vh] relative">
      @if (!loading()) {
        @if ((innerScope() === 'EnableMfa' || innerScope() === 'ConfigMfa')) {
          @if ((enableMfaStep() === 'CHOOSE_STRATEGY' || disableMfaStep() === 'CHOOSE_STRATEGY')) {
            <p class="text-lg mb-6">
              Strategie di autenticazione a più fattori:
            </p>
            <div class="flex flex-col gap-y-4">
              @for (s of allMfaStrategies; track s) {
                <m-mfa-strategy-card
                  [strategy]="s"
                  [activeStrategies]="enabledMfaStrategies()"
                  [showActions]="true"
                  (onEnableMfa)="handleEnableMfa($event)"
                  (onDisableMfa)="handleDisableMfa($event)"  />
              }
            </div>
          } @else if (enableMfaStep() === 'OTP_VERIFICATION') {
            <div class="px-6 py-4 border border-slate-600 dark:border-slate-400 bg-yellow-50 dark:bg-slate-700 flex gap-6 items-center rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-12 w-auto">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M256 240C256 160.5 320.5 96 400 96C479.5 96 544 160.5 544 240C544 319.5 479.5 384 400 384C388.9 384 378 382.7 367.6 380.4L359 378.4L352.7 384.7L321.3 416.1L255.9 416.1L255.9 480.1L191.9 480.1L191.9 544.1L95.9 544.1L95.9 462.7L258.7 299.9L265.6 293L262.7 283.7C258.3 269.9 256 255.3 256 240zM400 64C302.8 64 224 142.8 224 240C224 255.1 225.9 269.8 229.5 283.9L68.7 444.7L64 449.4L64 576L224 576L224 512L288 512L288 448L334.6 448L339.3 443.3L369.3 413.3C379.3 415.1 389.5 416 400 416C497.2 416 576 337.2 576 240C576 142.8 497.2 64 400 64zM432 232C445.3 232 456 221.3 456 208C456 194.7 445.3 184 432 184C418.7 184 408 194.7 408 208C408 221.3 418.7 232 432 232z"/>
              </svg>
                @switch (this.currentMfaStrategy()) {
                  @case ('EMAIL_OTP') {
                    <p class="text-light-warning dark:text-dark-warning font-semibold">
                      Abbiamo inviato un codice di sicurezza monouso all'indirizzo e-mail <span class="text-light-accent-primary dark:text-dark-accent-primary">{{obscuredEmail()}}</span>. Per attivare l'autenticazione a più fattori via e-mail, inserisci il codice nel seguente campo di input.
                    </p>
                  }
                  @case ('SMS_OTP') {
                    <p class="text-light-warning dark:text-dark-warning font-semibold">
                      Abbiamo inviato un codice di sicurezza via SMS monouso al numero <span class="text-light-accent-primary dark:text-dark-accent-primary">{{obscuredPhone()}}</span>. Per attivare l'autenticazione a più fattori via SMS, inserisci il codice nel seguente campo di input.
                    </p>
                  }
                  @case ('APP_TOTP') {
                    <p class="text-light-warning dark:text-dark-warning font-semibold">
                      Inserisci il codice monouso generato dalla tua app di autenticazione preferita per attivare l'autenticazione a più fattori via app.
                    </p>
                  }
                }
              </div>
              <div class="absolute inset-0 top-8 flex justify-center items-center">
                 <app-floating-input
                   label="Codice monouso"
                   type="text"
                   autocomplete="text"
                   [formControl]="otpCtrl"
                   [errors]="{
                     required: 'Il codice monouso è obbligatorio.',
                     pattern: 'Il codice deve contenere 6 cifre.'
                   }"
                   [serverError]="serverErrorMsg"
                   [bgClass]="'bg-white'"
                   [darkBgClass]="'dark:bg-dark-surface-main'"
                   (enter)="routeAction()"
                />
            </div>
          } @else if (enableMfaStep() === 'OK_OR_ERROR') {
            <div class="bg-slate-200 dark:bg-slate-800 border my-16 border-slate-300 dark:border-slate-600 relative p-3 mx-auto max-w-[1024px] rounded-md text-sm flex gap-2 xs:gap-4 items-center flex-col xs:flex-row">
              @if (!serverError()) {
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-20 h-auto shrink-[0.5] text-emerald-800 dark:text-emerald-400">
                  <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                  <path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 128C214 128 128 214 128 320C128 426 214 512 320 512C426 512 512 426 512 320C512 214 426 128 320 128zM439.6 272L419.8 291.8L307.8 403.8C296.9 414.7 279.1 414.7 268.2 403.8C231.5 367.1 208.9 344.5 200.4 336L240 296.4C251.8 308.2 267.8 324.2 288 344.4L380.2 252.2L400 232.4L439.6 272z"/>
                </svg>
                @switch (currentMfaStrategy()) {
                  @case ('EMAIL_OTP') {
                    <span>L'autenticazione a più fattori via e-mail è stata attivata con successo.</span>
                  }
                  @case ('SMS_OTP') {
                    <span>L'autenticazione a più fattori via SMS è stata attivata con successo.</span>
                  }
                  @case ('APP_TOTP') {
                    <span>L'autenticazione a più fattori tramite app di autenticazione è stata attivata con successo.</span>
                  }
                }
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-20 h-auto shrink-[0.5] text-light-error dark:text-dark-error">
                  <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                  <path d="M320 96C443.7 96 544 196.3 544 320C544 443.7 443.7 544 320 544C196.3 544 96 443.7 96 320C96 196.3 196.3 96 320 96zM320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM419.4 243.2L396.8 220.6L385.5 231.9L320 297.4L254.5 231.9L243.2 220.6L220.6 243.2L231.9 254.5L297.4 320L231.9 385.5L220.6 396.8L243.2 419.4L254.5 408.1L320 342.6L385.5 408.1L396.8 419.4L419.4 396.8L342.6 320L408.1 254.5L419.4 243.2z"/>
                </svg>
                  @switch (serverError()) {
                      @case (401) {
                        Il codice monouso è errato.
                      }
                      @case (429) {
                        Hai raggiunto il limite massimo di richieste inoltrate al server. Riprova fra alcuni minuti.
                      }
                      @default {
                        Si è verificato un errore.
                      }
                  }
              }
            </div>
            @if (backupCodes().length !== 0) {
              <div class="relative -top-6">
                <h4 class="my-3 font-semibold text-center">Codici di backup</h4>
                <p class="text-sm text-center mb-6">Copia questi codici in un password manager o stampali e custodiscili in un posto sicuro. Ti permetteranno di accedere nel caso in cui perdessi l'accesso al tuo dispositivo.</p>
                <div class="flex gap-4 flex-wrap justify-center">
                  @for (code of backupCodes(); track code) {
                    <span class="text-light-accent-primary dark:text-dark-accent-primary font-bold">{{code}}</span>
                  }
                </div>
              </div>
            }
          } @else if (enableMfaStep() === 'APP:SCAN_QR_CODE_OR_COPY_SECRET') {
            <div class="px-6 py-4 border border-slate-600 dark:border-slate-400 bg-yellow-50 dark:bg-slate-700 flex gap-6 items-center rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-12 w-auto">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M256 240C256 160.5 320.5 96 400 96C479.5 96 544 160.5 544 240C544 319.5 479.5 384 400 384C388.9 384 378 382.7 367.6 380.4L359 378.4L352.7 384.7L321.3 416.1L255.9 416.1L255.9 480.1L191.9 480.1L191.9 544.1L95.9 544.1L95.9 462.7L258.7 299.9L265.6 293L262.7 283.7C258.3 269.9 256 255.3 256 240zM400 64C302.8 64 224 142.8 224 240C224 255.1 225.9 269.8 229.5 283.9L68.7 444.7L64 449.4L64 576L224 576L224 512L288 512L288 448L334.6 448L339.3 443.3L369.3 413.3C379.3 415.1 389.5 416 400 416C497.2 416 576 337.2 576 240C576 142.8 497.2 64 400 64zM432 232C445.3 232 456 221.3 456 208C456 194.7 445.3 184 432 184C418.7 184 408 194.7 408 208C408 221.3 418.7 232 432 232z"/>
              </svg>
              <p class="text-light-warning dark:text-dark-warning font-semibold">
                Scansiona il QR con la tua app di autenticazione per configurare l'autenticazione a più fattori, oppure copia nella tua app di autenticazione il codice qui riportato.
              </p>
            </div>
            <img class="w-52 mt-4 mx-auto" [src]="qrCode()" alt="QR Code">
            <div class="mt-4 flex justify-center items-center gap-4">
              <p class="font-bold">{{appSecret()}}</p>
              <button
                type="button"
                class="relative p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700
                       transition-colors duration-150"
                title="Copia."
              >
                <svg
                  class="size-7 text-slate-600 dark:text-slate-300"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true">
                    <path
                      d="M4 4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1h-1V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h1v1H6a2 2 0 0 1-2-2V4z"
                    />
                    <path
                      d="M8 6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V6z" />
                </svg>
              </button>
            </div>

          }
        }
      } @else {
        <div class="absolute inset-0 flex justify-center items-center z-[999]">
          <app-classic-spinner [size]="45" />
        </div>
      }
    </div>
    <div class="my-4 mr-8 flex justify-end gap-2">
        <button
          [class.hidden]="enableMfaStep() === 'CHOOSE_STRATEGY' || disableMfaStep() === 'CHOOSE_STRATEGY' || enableMfaStep() === 'OK_OR_ERROR' || disableMfaStep() === 'OK_OR_ERROR'"
          type="button"
          class="px-4 py-2 rounded bg-slate-200 text-light-on-surface-main dark:bg-slate-100 dark:text-neutral-950 hover:bg-gray-300"
          (click)="close()"
        >
          Annulla
        </button>

      <button
        [class.invisible]="enableMfaStep() === 'CHOOSE_STRATEGY' || disableMfaStep() === 'CHOOSE_STRATEGY'"
        (click)="routeAction()"
        type="submit"
        class="relative inline-flex items-center justify-center px-4 py-2 rounded bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed"
        [disabled]="loading()"
        [attr.aria-busy]="loading()"
      >

        <span>
          @if (enableMfaStep() === 'OTP_VERIFICATION' || disableMfaStep() === 'OTP_VERIFICATION') {
            <span>Verifica codice</span>
          } @else if (enableMfaStep() === 'APP:SCAN_QR_CODE_OR_COPY_SECRET') {
            <span>Avanti</span>
          } @else if (enableMfaStep() === 'OK_OR_ERROR' || disableMfaStep() === 'OK_OR_ERROR') {
            <span>Ok</span>
          }
        </span>

        <!-- Overlay spinner without affecting layout -->
        <span
          aria-hidden="true"
          class="absolute inset-0 flex items-center justify-center"
          [class.hidden]="!loading()"
        >
          <app-classic-spinner [size]="24"></app-classic-spinner>
        </span>
      </button>
    </div>
  </div>
</div>
  `
})
export class SensitiveDataChangeComponent implements OnInit, OnDestroy {

  private readonly actionContext = inject(ActionOverlayContextService)
  private readonly dataChangeContext = inject(SensitiveDataChangeContextService)
  private readonly accountService = inject(AccountService)
  private readonly toast = inject(ToastService)
  private readonly fb = inject(NonNullableFormBuilder)
  private readonly authService = inject(AuthService)
  private readonly countryService = inject(CountryService)

  emailCtrl!: FormControl
  phoneForm!: FormGroup
  otpCtrl!: FormControl
  passwordForm!: FormGroup

  private fetchSub?: Subscription
  private enMfaSub?: Subscription
  private disMfaSub?: Subscription
  private enMfaTotpSub?: Subscription
  private disMfaTotpSub?: Subscription

  private fluxStarter$: Observable<null> = of(null)

  innerScope = signal<SensitiveDataChangeInnerScope>('')

  readonly serverErrorMsg = ''//'Si è verificato un errore.'

  readonly allMfaStrategies: MfaStrategy[] = ['EMAIL_OTP', 'SMS_OTP', 'APP_TOTP']

  changeOrAddContactStep = signal<'NEW_CONTACT_FORM' | 'OTP_VERIFICATION' | 'OK_OR_ERROR' | ''>('')
  removePhoneStep = signal<'OTP_VERIFICATION' | 'OK_OR_ERROR' | ''>('')
  enableMfaStep = signal<'CHOOSE_STRATEGY' | 'APP:SCAN_QR_CODE_OR_COPY_SECRET' | 'OTP_VERIFICATION' | 'OK_OR_ERROR' | ''>('')
  disableMfaStep = signal<'CHOOSE_STRATEGY' | 'OTP_VERIFICATION' | 'OK_OR_ERROR' | ''>('')
  changePasswordStep = signal<'CHANGE_PASSWORD_FORM' | 'OK_OR_ERROR' | ''>('')

  enabledMfaStrategies = signal<MfaStrategy[]>([])

  backupCodes = signal<string[]>([])

  serverError = signal<number>(0)

  phonePrefixes = signal<PhonePrefixDTO[]>([])

  obscuredEmail = signal<string>('')
  obscuredPhone = signal<string>('')

  currentMfaStrategy = signal<MfaStrategy | ''>('')

  loading = signal<boolean>(false)

  private secureToken = signal<string>('')
  private otpauthUrl = signal<string>('')
  appSecret = signal<string>('')
  qrCode = signal<string>('')

  mfaStrategiesDescrMap!: Map<MfaStrategy, string>



  ngOnInit(): void {
    this.fetchSub = this.fluxStarter$.pipe(
      tap(() => {
        this.mfaStrategiesDescrMap = this.authService.getMfaStrategiesDescrMap()
        this.emailCtrl = this.fb.control('', [Validators.required, Validators.pattern('todo')], emailAvailabilityValidator(this.authService))
        this.phoneForm = this.fb.group({
          prefix: this.fb.control(107),
          phone: this.fb.control('', [Validators.required, Validators.pattern('todo')])
        })
        this.otpCtrl = this.fb.control('', [Validators.required, Validators.pattern(/^\d{6}$/)])
        this.passwordForm = this.fb.group({
          oldPassword: this.fb.control('', Validators.required),
          newPassword: this.fb.control('', [Validators.required, Validators.pattern('todo')])
        })
      }),
      switchMap(() => {
        return combineLatest([
          this.accountService.getMaskedEmail(),
          this.accountService.getMaskedPhone()
        ]).pipe(
          tap(([maskedEmail, maskedPhone]) => {
            this.obscuredEmail.set(maskedEmail)
            this.obscuredPhone.set(maskedPhone ?? '')
          })
        )
      }),
      switchMap(() => {
        const is = this.dataChangeContext.innerScope()
        if (!is) {
          this.close()
          return EMPTY
        }
        this.innerScope.set(is)
        switch (is) {
          case 'ChangeEmail':
            this.changeOrAddContactStep.set('NEW_CONTACT_FORM')
            return this.accountService.getMaskedEmail()
          case 'EnableMfa':
            this.enableMfaStep.set('CHOOSE_STRATEGY')
            return this.accountService.getMaskedEmail()
          case 'ConfigMfa':
            this.enableMfaStep.set('CHOOSE_STRATEGY')
            this.disableMfaStep.set('CHOOSE_STRATEGY')
            return this.accountService.getEnabledMfaStrategies()
          case 'AddPhone':
          case 'ChangePhone':
            this.changeOrAddContactStep.set('NEW_CONTACT_FORM')
            return this.accountService.getMaskedPhone()
          case 'ChangePassword':
            this.changePasswordStep.set('CHANGE_PASSWORD_FORM')
            return of(null)
          case 'RemovePhone':
            this.removePhoneStep.set('OTP_VERIFICATION')
            return this.accountService.getMaskedPhone()
          default:
            this.close()
            return EMPTY
        }
      }),
      tap(res => {
        switch (this.innerScope()) {
          case 'ConfigMfa':
            this.enabledMfaStrategies.set((res as MfaStrategy[]) ?? [])
            break
          case 'EnableMfa':
          case 'ChangeEmail':
            this.obscuredEmail.set((res as string) ?? '')
            break
          case 'AddPhone':
          case 'ChangePhone':
          case 'RemovePhone':
            this.obscuredPhone.set((res as string) ?? '')
            break
          case 'ChangePassword':
            // pass
            break
          default:
            this.close()
            return
        }
      }),
      switchMap(() => {
        if (['ConfigMfa', 'EnableMfa', 'AddPhone', 'ChangePhone'].includes(this.innerScope())) {
          return this.countryService.getAllPhonePrefixes()
        }
        return of(null)
      })
    ).subscribe({
      next: (res) => {
        if (res != null) {
          this.phonePrefixes.set(res)
        }
      },
      error: (e: HttpErrorResponse) => {
        queueMicrotask(() => {
          this.onError()
          this.close()
        })
      }
    })

  }

  ngOnDestroy(): void {
    this.fetchSub?.unsubscribe()
    this.enMfaSub?.unsubscribe()
    this.disMfaSub?.unsubscribe()
    this.enMfaTotpSub?.unsubscribe()
    this.disMfaTotpSub?.unsubscribe()
  }

  private onError(): void {
    this.toast.trigger('Si è verificato un errore.', 'error', 3000)
  }

  close(): void {
    this.dataChangeContext.notifyAdded()
    this.dataChangeContext.clearInnerScope()
    this.actionContext.close()
  }

  handleEnableMfa(s: MfaStrategy): void {
    this.loading.set(true)
    this.enMfaSub = this.accountService.enableMfa_firstStep(s).subscribe({
      next: (res) => {
        if (!res.secureToken) {
          this.onError()
          this.loading.set(false)
          return
        }
        if (s === 'APP_TOTP' && (!res.qrCode || !res.otpauthUrl || !res.secret)) {
          this.onError()
          this.loading.set(false)
          return
        }
        queueMicrotask(() => {
          this.currentMfaStrategy.set(s)
          this.disableMfaStep.set('')
          this.enableMfaStep.set(s === 'APP_TOTP' ? 'APP:SCAN_QR_CODE_OR_COPY_SECRET' : 'OTP_VERIFICATION')
          if (s === 'APP_TOTP') {
            this.qrCode.set(res.qrCode!)
            this.otpauthUrl.set(res.otpauthUrl!)
            this.appSecret.set(res.secret!)
          }
          this.secureToken.set(res.secureToken)
          this.loading.set(false)
        })
      },
      error: () => {
        this.loading.set(false)
        this.onError()
      }
    })
  }

  handleDisableMfa(s: MfaStrategy): void {
    this.disMfaSub = this.accountService.disableMfa_firstStep(s).subscribe({
      next: (res) => {
        if (!res.secureToken) {
          this.onError()
          return
        }
        this.currentMfaStrategy.set(s)
        this.secureToken.set(res.secureToken)
        this.enableMfaStep.set('')
        this.disableMfaStep.set('OTP_VERIFICATION')
      },
      error: () => this.onError()
    })
  }

  routeAction(): void {
    if (this.enableMfaStep() === 'OTP_VERIFICATION' && this.currentMfaStrategy()) {
      this.verifyTotpForEnablingMfa(this.currentMfaStrategy() as MfaStrategy)
      return
    }
    if (this.disableMfaStep() === 'OTP_VERIFICATION' && this.currentMfaStrategy()) {
      this.verifyTotpForDisablingMfa(this.currentMfaStrategy() as MfaStrategy)
      return
    }
    if (this.enableMfaStep() === 'APP:SCAN_QR_CODE_OR_COPY_SECRET') {
      this.enableMfaStep.set('OTP_VERIFICATION')
      return
    }
    if (this.enableMfaStep() === 'OK_OR_ERROR' || this.disableMfaStep() === 'OK_OR_ERROR') {
      this.close()
      return
    }
    this.onError()
  }

  private verifyTotpForEnablingMfa(s: MfaStrategy): void {
    this.otpCtrl.markAsTouched()
    if (this.otpCtrl.invalid) {
      return
    }
    this.serverError.set(0)
    this.loading.set(true)
    this.enMfaTotpSub = this.accountService.enableMfa_secondStep(s, this.otpCtrl.value, this.secureToken()).pipe(
      switchMap(() => {
        if (this.enabledMfaStrategies().length === 0) {
          return this.accountService.getBackupCodes()
        }
        return of(null)
      }),
      finalize(() => queueMicrotask(() => this.loading.set(false)))
    ).subscribe({
      next: (codes) => queueMicrotask(() => {
        if (codes != null && Array.isArray(codes)) {
          this.backupCodes.set(codes)
        }
        this.enableMfaStep.set('OK_OR_ERROR')
      }),
      error: (e: HttpErrorResponse) => queueMicrotask(() => {
        this.serverError.set(e.status)
        this.enableMfaStep.set('OK_OR_ERROR')
      })
    })
  }

  private verifyTotpForDisablingMfa(s: MfaStrategy): void {
    this.otpCtrl.markAsTouched()
    if (this.otpCtrl.invalid) {
      return
    }
    this.serverError.set(0)
    this.loading.set(true)
    this.disMfaTotpSub = this.accountService.disableMfa_secondStep(s, this.otpCtrl.value, this.secureToken()).pipe(
      finalize(() => queueMicrotask(() => this.loading.set(false)))
    ).subscribe({
      next: () => queueMicrotask(() => {
        this.enableMfaStep.set('OK_OR_ERROR')
      }),
      error: (e: HttpErrorResponse) => queueMicrotask(() => {
        this.serverError.set(e.status)
        this.enableMfaStep.set('OK_OR_ERROR')
      })
    })
  }

}
