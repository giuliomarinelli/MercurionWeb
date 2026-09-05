import { Component, ChangeDetectionStrategy, computed, DestroyRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FloatingInputComponent } from '../../components/common/floating-input/floating-input.component';
import { TurnstileComponent } from '../../components/common/turnstile/turnstile.component';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';
import { RecoveryService } from '../../services/recovery.service';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { PublicPipe } from '../../pipes/public.pipe';
import { ThemeManagerService } from '../../services/context/theme-manager.service';
import { environment } from '../../../environments/environment';
import { emailAvailabilityValidator, matchPassword } from '../../custom-validators';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'm-account-recovery.page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FloatingInputComponent,
    TurnstileComponent,
    ReactiveFormsModule,
    ClassicSpinnerComponent,
    PublicPipe,
    RouterLink
  ],
  template: `

    <!-- login-placeholder-mercurion.component.html -->
    <div class="min-h-screen flex flex-col items-center px-4 pt-9" role="main" aria-labelledby="account-recovery-heading">
      <!-- Logo -->
      <img
        [src]="logoSrc() | public"
        alt="Mercurion Logo"
        class="w-16 h-auto mb-6"
      />

      <!-- Welcome Message -->
      <h1
        id="account-recovery-heading"
        class="text-2xl font-semibold text-gray-900 mb-8 tracking-wider dark:text-slate-100 text-center flex items-center gap-4"
      >
        <span>Recupero dell'account.</span>
      </h1>
      <div class="w-full max-w-sm bg-slate-200 dark:bg-slate-800 border mb-8 border-slate-300 dark:border-slate-600 relative p-3 rounded-md text-sm flex gap-2 xs:gap-4 items-center flex-col xs:flex-row" aria-live="polite">
        @if ([1, 2].includes(step())) {
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current text-amber-950 dark:text-dark-warning size-12 shrink-0">
            <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
            <path d="M592 544L48 544L320 48L592 544zM292 420L292 476L348 476L348 420L292 420zM288 224L300.8 384L339.2 384L352 224L288 224z"/>
          </svg>
        } @else if (step() === 3) {
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current text-light-accent-secondary dark:text-dark-accent-secondary size-12 shrink-0">
            <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
            <path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 96C196.3 96 96 196.3 96 320C96 443.7 196.3 544 320 544C443.7 544 544 443.7 544 320C544 196.3 443.7 96 320 96zM438.3 236.5L428.9 249.4L300.9 425.4L289.9 440.6L201.3 352L223.9 329.4L286 391.5L403 230.7L412.4 217.8L438.3 236.6z"/>
          </svg>
        }
        <div class="flex flex-col gap-y-2 min-w-0 break-words">
          @switch (step()) {
              @case (1) {
                <span>Inserisci il codice di recupero dell'account che ti abbiamo fornito al momento dell'attivazione e clicca su <span class="font-semibold text-light-accent-primary-hc dark:text-dark-accent-primary-btn-hc">Continua</span></span>
              }
              @case (2) {
                <span>L'account è stato bloccato e ogni sessione è stata invalidata. Inserisci un indirizzo e-mail a cui hai accesso sicuro e una password complessa per reimpostare il tuo account e sbloccarlo, poi clicca su <span class="font-semibold text-light-accent-primary-hc dark:text-dark-accent-primary-btn-hc">Continua</span> per procedere.</span>
              }
              @case (3) {
                <p class="font-semibold">L'account è stato ripristinato con successo.</p>
                <p><span>Questo è il codice per recuperare l'account nel caso non riuscissi più ad accedere. Lo puoi visualizzare solo in questo momento. <br />Salvalo in un posto sicuro, come un Password Manager oppure stampalo e custodiscilo in un luogo inaccessibile ad altri:</span>.</p>
                <p class="text-amber-950 dark:text-dark-warning font-semibold" aria-live="assertive">{{recoveryCode()}}</p>
                <p><a class="a" routerLink="/login">Vai al login</a></p>
              }
          }
        </div>
      </div>
        <div class="w-full max-w-sm space-y-6">
          <!-- Step 1: Email -->
          @if (step() === 1) {
            <!-- STEP 1: CODE -->
            <div class="mt-2">
              <m-floating-input
                label="Codice di recupero"
                type="text"
                autocomplete="text"
                [formControl]="codeCtrl"
                (enter)="goToSecondStep()"
                [errors]="{
                  required: 'Il codice è obbligatorio.'
                }"
                [disabled]="loading()"
                [serverError]="computeServerErrorMsg(this.serverErrorStep())"
                (enter)="goToSecondStep()"
                darkLabelClass = 'dark:text-dark-accent-secondary-hc'
                darkFocusRingClass = 'dark:focus:ring-dark-accent-primary'
                darkFocusBorderClass = 'dark:focus:border-dark-accent-primary'/>
            </div>
              <button
                type="submit"
                [disabled]="loading() || !turnstileToken() || codeCtrl.invalid"
                [attr.aria-disabled]="loading() || !turnstileToken() || codeCtrl.invalid"
                (click)="goToSecondStep()"
                class="relative bottom-[2px] w-full mt-4 py-2 text-white rounded-md transition-colors duration-150 bg-light-accent-primary-hq dark:bg-dark-accent-primary-btn hover:bg-light-accent-primary-hc dark:hover:bg-dark-accent-primary/80 disabled:bg-light-accent-primary-hq/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary-hq/60 disabled:hover:dark:bg-dark-accent-primary/80">
                @if (!loading()) {
                  Continua
                } @else {
                  <div class="text-slate-200 flex items-center justify-center">
                    <m-classic-spinner [size]="24"></m-classic-spinner>
                  </div>
                }
              </button>
            <div class="flex justify-center">
              @if (loadingTurnstile()) {
                <div
                  class="w-[300px] h-[71px] overflow-hidden transition-all bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 animate-pulse skeleton-pulse"
                >
                  <span class="sr-only">Loading CAPTCHA…</span>
                </div>
              }
              <m-turnstile
                (token)="onTurnstileToken($event)"
                (widgetReady)="onTurnstileRender()"
                (refresh)="loadingTurnstile.set(true)"
                class="block h-[71px] mt-1"
              />
            </div>
          } @else if (step() === 2) {
            <!-- STEP 2: NUOVE CREDENZIALI -->
            <form [formGroup]="recoveryGroup" (ngSubmit)="goToThirdStep()">
              <div class="relative mb-6 mt-2">
                <m-floating-input
                  label="Nuova e-mail"
                  type="email"
                  autocomplete="email"
                  formControlName="email"
                  [errors]="{
                    required: 'E-mail obbligatoria.',
                    email: 'Formato e-mail non corretto',
                    pattern: 'Formato e-mail non corretto'
                  }"
                  [disabled]="loading()"
                  darkLabelClass = 'dark:text-dark-accent-secondary-hc'
                  darkFocusRingClass = 'dark:focus:ring-dark-accent-primary'
                  darkFocusBorderClass = 'dark:focus:border-dark-accent-primary' />
              </div>
              <div class="relative mb-6 mt-2">
                <m-floating-input
                label="Nuova password"
                type="password"
                autocomplete="current-password"
                formControlName="password"
                [errors]="{
                    required: 'Password obbligatoria.',
                    pattern: 'La password deve essere di almeno 8 caratteri: almeno uno minuscolo, uno maiuscolo, un numero e un carattere speciale.'
                  }"
                  darkLabelClass = 'dark:text-dark-accent-secondary-hc'
                  darkFocusRingClass = 'dark:focus:ring-dark-accent-primary'
                  darkFocusBorderClass = 'dark:focus:border-dark-accent-primary' />
              </div>
              <div class="relative mb-6 mt-2">
                <m-floating-input
                  label="Reinserisci la nuova password"
                  type="password"
                  autocomplete="current-password"
                  formControlName="confirmPassword"
                  [errors]="{
                      required: 'Il campo di conferma password è obbligatorio.',
                      matchPassword: 'Le due password non corrispondono.'
                    }"
                  [serverError]="computeServerErrorMsg(this.serverErrorStep())"
                  darkLabelClass = 'dark:text-dark-accent-secondary-hc'
                  darkFocusRingClass = 'dark:focus:ring-dark-accent-primary'
                  darkFocusBorderClass = 'dark:focus:border-dark-accent-primary' />
              </div>
              <div class="relative mb-3 mt-2">
                <button
                  type="submit"
                  [disabled]="loading() || !turnstileToken() || recoveryGroup.invalid"
                  [attr.aria-disabled]="loading() || !turnstileToken() || recoveryGroup.invalid"
                  class="relative bottom-[2px] w-full mt-4 py-2 text-white rounded-md transition-colors duration-150 bg-light-accent-primary-hq dark:bg-dark-accent-primary-btn hover:bg-light-accent-primary-hc dark:hover:bg-dark-accent-primary/80 disabled:bg-light-accent-primary-hq/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary-hq/60 disabled:hover:dark:bg-dark-accent-primary/80"
                >
                  @if (!loading()) {
                    Continua
                  } @else {
                    <div class="text-slate-200 flex items-center justify-center">
                      <m-classic-spinner [size]="24"></m-classic-spinner>
                    </div>
                  }
                </button>
              </div>
              <div class="flex justify-center relative top-3">
                @if (loadingTurnstile()) {
                  <div
                    class="w-[300px] h-[71px] overflow-hidden transition-all bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 animate-pulse skeleton-pulse"
                  >
                    <span class="sr-only">Loading CAPTCHA…</span>
                  </div>
                }
                <m-turnstile
                  (token)="onTurnstileToken($event)"
                  (widgetReady)="onTurnstileRender()"
                  (refresh)="loadingTurnstile.set(true)"
                  class="block h-[71px] mt-1"
                />
              </div>
            </form>

          }
          <div class="relative py-2 -top-1">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="bg-light-surface-main dark:bg-neutral-950 px-2 text-slate-700 dark:text-slate-200">OPPURE</span>
            </div>
          </div>
          <div class="space-y-3 dark:text-slate-100">
            <a href="mailto:mercurion.app@gmail.com"
              class="w-full flex items-center justify-center border rounded-md py-2.5 text-sm dark:hover:bg-slate-100 gap-3 dark:hover:text-neutral-900 hover:bg-slate-200/80 bg-slate-200 dark:bg-transparent transition-colors duration-150">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" class="h-5 w-auto fill-current">
                <path d="M544 248l0 3.3 69.7-69.7c21.9-21.9 21.9-57.3 0-79.2L535.6 24.4c-21.9-21.9-57.3-21.9-79.2 0L416.3 64.5c-2.7-.3-5.5-.5-8.3-.5L296 64c-37.1 0-67.6 28-71.6 64l-.4 0 0 120c0 22.1 17.9 40 40 40s40-17.9 40-40l0-72c0 0 0-.1 0-.1l0-15.9 16 0 136 0c0 0 0 0 .1 0l7.9 0c44.2 0 80 35.8 80 80l0 8zM336 192l0 56c0 39.8-32.2 72-72 72s-72-32.2-72-72l0-118.6c-35.9 6.2-65.8 32.3-76 68.2L99.5 255.2 26.3 328.4c-21.9 21.9-21.9 57.3 0 79.2l78.1 78.1c21.9 21.9 57.3 21.9 79.2 0l37.7-37.7c.9 0 1.8 .1 2.7 .1l160 0c26.5 0 48-21.5 48-48c0-5.6-1-11-2.7-16l2.7 0c26.5 0 48-21.5 48-48c0-12.8-5-24.4-13.2-33c25.7-5 45.1-27.6 45.2-54.8l0-.4c-.1-30.8-25.1-55.8-56-55.8c0 0 0 0 0 0l-120 0z" />
              </svg>
              <span>Richiedi assistenza</span>
            </a>
            @if ([1, 2].includes(step())) {
              <a routerLink="/login"
                class="w-full flex items-center justify-center border rounded-md py-2.5 text-sm dark:hover:bg-slate-100 gap-3 dark:hover:text-neutral-900 hover:bg-slate-200/80 bg-slate-200 dark:bg-transparent transition-colors duration-150">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="h-5 w-auto fill-current">
                  <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                  <path d="M320 96C355.3 96 384 124.7 384 160L384 224L256 224L256 160C256 124.7 284.7 96 320 96zM192 160L192 224L128 224L128 576L512 576L512 224L448 224L448 160C448 89.3 390.7 32 320 32C249.3 32 192 89.3 192 160zM344 360L344 464L296 464L296 336L344 336L344 360z"/>
                </svg>
                <span>Vai al Login</span>
              </a>
            }
          </div>
        </div>

  `
})
export class AccountRecoveryPageComponent implements OnInit, OnDestroy {

  @ViewChild(TurnstileComponent)
  private turnstileComponent?: TurnstileComponent

  private readonly recoveryService = inject(RecoveryService)
  private readonly authService = inject(AuthService)
  private readonly themeManager = inject(ThemeManagerService)
  private readonly fb = inject(NonNullableFormBuilder)
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)

  private firstStepSub?: Subscription
  private secondStepSub?: Subscription
  private codeCtrlSub?: Subscription
  private recoveryGroupSub?: Subscription
  private passwordValueChangesSub?: Subscription

  codeCtrl!: FormControl
  recoveryGroup!: FormGroup

  logoSrc = computed<string>(() => {
    const { PICTOGRAM_LIGHT, PICTOGRAM_DARK } = environment.logoSrc
    return this.themeManager.theme() === 'light' ? PICTOGRAM_LIGHT : PICTOGRAM_DARK
  })

  serverErrorStep = signal<{ code: number, step: 0 | 1 | 2 | 3 }>({
    code: 0,
    step: 0
  })

  turnstileToken = signal<string>('')
  loadingTurnstile = signal<boolean>(true)
  loading = signal<boolean>(false)
  step = signal<1 | 2 | 3>(1)
  recoveryToken = signal<string>('')
  recoveryCode = signal<string>('')

  ngOnInit(): void {
    this.codeCtrl = this.fb.control('', [Validators.required])
    this.recoveryGroup = this.fb.group(
      {
        email: this.fb.control(
          '',
          [Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)],
          emailAvailabilityValidator(this.authService)
        ),
        password: this.fb.control('', [Validators.required, Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8 }$/)]),
        confirmPassword: this.fb.control('', [Validators.required, matchPassword])
      },
      { validators: matchPassword })
    this.codeCtrlSub = this.codeCtrl.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.serverErrorStep.set({ code: 0, step: 0 })
      this.codeCtrl.updateValueAndValidity()
    })
    this.recoveryGroupSub = this.recoveryGroup.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.serverErrorStep.set({ code: 0, step: 0 })
      this.recoveryGroup.updateValueAndValidity()
    })
    const passwordCtrl = this.recoveryGroup.get('password')
    const confirmPasswordCtrl = this.recoveryGroup.get('confirmPassword')
    if (passwordCtrl && confirmPasswordCtrl) {
      this.passwordValueChangesSub = passwordCtrl.valueChanges.pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(() => {
        confirmPasswordCtrl.updateValueAndValidity({ onlySelf: true })
      })
    }
  }

  ngOnDestroy(): void {
    this.firstStepSub?.unsubscribe()
    this.secondStepSub?.unsubscribe()
    this.codeCtrlSub?.unsubscribe()
    this.recoveryGroupSub?.unsubscribe()
    this.passwordValueChangesSub?.unsubscribe()
  }

  goToSecondStep(): void {
    this.codeCtrl.markAsTouched()
    if (this.codeCtrl.valid && this.turnstileToken()) {
      this.loading.set(true)
      this.firstStepSub = this.recoveryService.accountRecovery_firstStep(this.codeCtrl.value, this.turnstileToken()).pipe(
        finalize(() => {
          this.turnstileToken.set('')
          this.loading.set(false)
          queueMicrotask(() => this.resetTurnstileWidget())
        }),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: (res) => {
          this.recoveryToken.set(res.recoveryToken)
          this.resetServerError()
          this.step.set(2)
        },
        error: (e: HttpErrorResponse) => this.serverErrorStep.set({ step: 1, code: e.status })
      })
    }
  }

  goToThirdStep(): void {
    this.recoveryGroup.markAllAsTouched()
    if (this.recoveryGroup.valid && this.turnstileToken()) {
      this.loading.set(true)
      this.secondStepSub = this.recoveryService.accountRecovery_secondStep(
        this.recoveryGroup.controls['email'].value,
        this.recoveryGroup.controls['password'].value,
        this.recoveryToken(),
        this.turnstileToken()
      ).pipe(
        finalize(() => {
          this.turnstileToken.set('')
          this.loading.set(false)
          queueMicrotask(() => this.resetTurnstileWidget())
        }),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: (res) => {
          this.recoveryCode.set(res.recoveryCode)
          this.resetServerError()
          this.step.set(3)
        },
        error: (e: HttpErrorResponse) => this.serverErrorStep.set({ step: 2, code: e.status })
      })
    }
  }

  onTurnstileToken(token: string): void {
    this.turnstileToken.set(token)
  }

  onTurnstileRender(): void {
    this.loadingTurnstile.set(false)
  }

  computeServerErrorMsg(input: { code: number, step: 0 | 1 | 2 | 3 }): string | null | never {
    if (input.step === 0 || input.code === 0) {
      return null
    }
    switch (input.step) {
      case 1:
        switch (input.code) {
          case 401:
            return 'Il codice è errato.'
          case 429:
            return 'Troppi tentativi, riprova in seguito.'
          default:
            return 'Si è verificato un errore imprevisto.'
        }
      case 2:
        switch (input.code) {
          case 401:
          case 403:
            this.router.navigateByUrl('/403-forbidden')
            break
          case 429:
            return 'Troppi tentativi, riprova in seguito.'
          default:
            return 'Si è verificato un errore imprevisto.'
        }
    }
    return 'Si è verificato un errore imprevisto.'
  }

  private resetTurnstileWidget(): void {
    if (!this.turnstileComponent) {
      this.loadingTurnstile.set(false)
      return
    }
    this.loadingTurnstile.set(true)
    this.turnstileComponent.reset()
  }

  private resetServerError(): void {
    this.serverErrorStep.set({
      code: 0,
      step: 0
    })
  }

}
