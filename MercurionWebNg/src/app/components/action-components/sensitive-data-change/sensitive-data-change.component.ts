import { MfaStrategy } from './../../../Models/account/account.models';
import { SensitiveDataChangeInnerScope } from './../../../Models/action/action-overlay.models';
import { SensitiveDataChangeContextService } from './../../../services/context/action-context/sensitive-data-change-context.service';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ClassicSpinnerComponent } from '../../common/classic-spinner/classic-spinner.component';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { EMPTY, Observable, of, Subscription, switchMap, tap } from 'rxjs';
import { AccountService } from '../../../services/account.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../../services/toast.service';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { emailAvailabilityValidator } from '../../../custom-validators';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'm-sensitive-data-change',
  imports: [ClassicSpinnerComponent, ReactiveFormsModule],
  template: `
  <!-- 'EnableMfa'
  | 'ConfigMfa'
  | 'ChangeEmail'
  | 'ChangePhone'
  | 'AddPhone' -->

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
    <div class="py-6 px-3 overflow-y-auto flex flex-col gap-4 min-h-[60vh] max-h-[60vh]">
      <!-- body -->
    </div>
    <div class="my-4 mr-8 flex justify-end gap-2">
      @if (true) {
        <button
          type="button"
          class="px-4 py-2 rounded bg-slate-200 text-light-on-surface-main dark:bg-slate-100 dark:text-neutral-950 hover:bg-gray-300"

        >
          Annulla
        </button>
      }
      <button
        type="submit"
        class="relative inline-flex items-center justify-center px-4 py-2 rounded bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed"
        [disabled]="false"
        [attr.aria-busy]=""
      >

        <span [class.invisible]="">
          @if (0) {
            <span>Aggiungi</span>
          } @else if (1) {
            <span>Ok</span>
          }
        </span>

        <!-- Overlay spinner without affecting layout -->
        <span
          aria-hidden="true"
          class="absolute inset-0 flex items-center justify-center"
          [class.hidden]="true"
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

  emailCtrl!: FormControl
  phoneForm!: FormGroup
  otpCtrl!: FormControl
  passwordForm!: FormGroup

  private fetchSub?: Subscription

  private fluxStarter$: Observable<null> = of(null)

  innerScope = signal<SensitiveDataChangeInnerScope>('')

  changeOrAddContactStep = signal<'NEW_CONTACT_FORM' | 'OTP_VERIFICATION' | 'OK_OR_ERROR' | ''>('')
  removePhoneStep = signal<'OTP_VERIFICATION' | 'OK_OR_ERROR' | ''>('')
  enableMfaStep = signal<'CHOOSE_STRATEGY' | 'APP:SCAN_QR_CODE_OR_COPY_SECRET' | 'OTP_VERIFICATION' | 'OK_OR_ERROR' | ''>('')
  disableMfaStep = signal<'CHOOSE_STRATEGY' | 'OTP_VERIFICATION' | 'OK_OR_ERROR' | ''>('')
  changePasswordStep = signal<'CHANGE_PASSWORD_FORM' | 'OK_OR_ERROR' | ''>('')

  enabledMfaStrategies = signal<MfaStrategy[]>([])
  maskedEmail = signal<string>('')
  maskedPhone = signal<string>('')



  ngOnInit(): void {
    this.fetchSub = this.fluxStarter$.pipe(
      tap(() => {
        this.emailCtrl = this.fb.control('', [Validators.required, Validators.pattern('todo')], emailAvailabilityValidator(this.authService))
        this.phoneForm = this.fb.group({
          prefix: this.fb.control('+39'),
          phone: this.fb.control('', [Validators.required, Validators.pattern('todo')])
        })
        this.otpCtrl = this.fb.control('', [Validators.required, Validators.pattern('todo')])
        this.passwordForm = this.fb.group({
          oldPassword: this.fb.control('', Validators.required),
          newPassword: this.fb.control('', [Validators.required, Validators.pattern('todo')])
        })
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
          case 'EnableMfa':
            this.enabledMfaStrategies.set((res as MfaStrategy[]) ?? [])
            break
          case 'ChangeEmail':
            this.maskedEmail.set((res as string) ?? '')
            break
          case 'AddPhone':
          case 'ChangePhone':
          case 'RemovePhone':
            this.maskedPhone.set((res as string) ?? '')
            break
          case 'ChangePassword':
            // pass
            break
          default:
            this.close()
            return
        }
      })
    ).subscribe({
      next: () => { /* pass */ },
      error: (e: HttpErrorResponse) => {
        queueMicrotask(() => {
          this.toast.trigger('Si è verificato un errore.', 'error', 3000)
          this.close()
        })
      }
    })


  }

  ngOnDestroy(): void {
    this.fetchSub?.unsubscribe()
  }

  close(): void {
    this.dataChangeContext.clearInnerScope()
    this.actionContext.close()
  }

}
