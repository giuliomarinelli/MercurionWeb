import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FloatingInputComponent } from '../../components/common/floating-input/floating-input.component';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountService } from '../../services/account.service';
import { Subscription } from 'rxjs';
import { TurnstileComponent } from '../../components/common/turnstile/turnstile.component';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'm-forgot-password',
  imports: [FloatingInputComponent, ReactiveFormsModule, TurnstileComponent, ClassicSpinnerComponent],
  template: `

    <main class="block" role="main" aria-live="polite" aria-busy="{{ step_12_loading() }}">
      <h1 id="forgot-password-title" class="text-2xl mt-2 2xs:text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center text-light-accent-primary-hc dark:text-dark-accent-primary">
          Recupero password
      </h1>
      @switch (step()) {
        @case (1) {
          <div class="bg-slate-200 dark:bg-slate-800 border my-16 border-slate-300 dark:border-slate-600 relative p-3 mx-auto max-w-[1024px] rounded-md text-sm flex gap-2 xs:gap-4 items-center flex-col xs:flex-row" role="status" aria-live="polite">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current size-16 shrink-[0.5]" aria-hidden="true">
              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path d="M320 96C443.7 96 544 196.3 544 320C544 443.7 443.7 544 320 544C196.3 544 96 443.7 96 320C96 196.3 196.3 96 320 96zM320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM272 416L256 416L256 448L384 448L384 416L336 416L336 288L256 288L256 320L304 320L304 416L272 416zM344 248L344 200L296 200L296 248L344 248z"/>
            </svg>
            <span>Inserisci il tuo indirizzo e-mail e clicca su <strong>Recupera</strong>. Ti invieremo una mail con un link valido una sola volta
              e per pochi minuti dal quale potrai impostare una nuova password.
            </span>
          </div>
          <!-- STEP 1: EMAIL -->
          <div class="mt-2 max-w-[400px] mx-auto" aria-labelledby="forgot-password-title">
            <m-floating-input
              label="Indirizzo e-mail"
              type="email"
              autocomplete="email"
              [formControl]="email"
              [errors]="{
                required: 'E-mail obbligatoria.',
                email: 'Formato e-mail non corretto',
              }"
              [serverError]="
                serverError() ? this.errMsg() : null
              "
              (enter)="send()"
              darkLabelClass = 'dark:text-dark-accent-secondary-hc'
              darkFocusRingClass = 'dark:focus:ring-dark-accent-primary'
              darkFocusBorderClass = 'dark:focus:border-dark-accent-primary'
            />

            <button
              type="button"
              (click)="send()"
              [disabled]="email.invalid || !turnstileToken() || step_12_loading()"
              class="relative top-[10px] w-full py-2 text-white rounded-md transition-colors duration-150 bg-light-accent-primary-hq dark:bg-dark-accent-primary-btn hover:bg-light-accent-primary-hc dark:hover:bg-dark-accent-primary/80 disabled:bg-light-accent-primary-hq/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary-hq/60 disabled:hover:dark:bg-dark-accent-primary/80"
              [attr.aria-disabled]="email.invalid || !turnstileToken() || step_12_loading()"
              [attr.aria-busy]="step_12_loading()"
              aria-label="Recupera password"
            >
              @if (!step_12_loading()) {
                Recupera
              } @else {
                <div class="text-slate-200 flex items-center justify-center" aria-hidden="true">
                  <m-classic-spinner [size]="24"></m-classic-spinner>
                </div>

              }
            </button>
            <div class="flex justify-center mt-10">
              @if (loadingTurnstile()) {
                <div
                  class="w-[300px] h-[71px] overflow-hidden transition-all bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 animate-pulse skeleton-pulse"
                  role="status"
                  aria-live="polite"
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
            @if (serverError()) {
              <p class="mt-3 text-sm text-red-700 dark:text-red-400" role="alert" aria-live="assertive">
                {{ errMsg() }}
              </p>
            }
          </div>
        }
        @case (2) {
          <div class="bg-slate-200 dark:bg-slate-800 border my-16 border-slate-300 dark:border-slate-600 relative p-3 mx-auto max-w-[1024px] rounded-md text-sm flex gap-2 xs:gap-4 items-center flex-col xs:flex-row" role="status" aria-live="polite">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current size-16 shrink-[0.5] text-emerald-800 dark:text-emerald-400" aria-hidden="true">
              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 96C196.3 96 96 196.3 96 320C96 443.7 196.3 544 320 544C443.7 544 544 443.7 544 320C544 196.3 443.7 96 320 96zM438.3 236.5L428.9 249.4L300.9 425.4L289.9 440.6L201.3 352L223.9 329.4L286 391.5L403 230.7L412.4 217.8L438.3 236.6z" />
            </svg>
            <span>Un'e-mail con un link per creare una nuova password è stata inviata a <strong class="text-light-accent-primary-hc dark:text-dark-accent-primary">{{obscuredEmail()}}</strong>. Il link è valido una volta sola e soltanto per pochi minuti!
            </span>
          </div>
        }
      }
    </main>

  `

})
export class ForgotPasswordPageComponent implements OnInit, OnDestroy {


  private readonly accountService = inject(AccountService)



  protected loadingTurnstile = signal<boolean>(true)
  protected resetTurnstile = signal<boolean>(false)
  protected turnstileToken = signal<string | null>(null)
  protected step = signal<1 | 2>(1)
  protected serverError = signal<boolean>(false)
  protected step_12_loading = signal<boolean>(false)
  protected obscuredEmail = signal<string>('')
  protected errMsg = signal<string>('Si è verificato un errore.')

  protected email = new FormControl<string | null>(null, [Validators.required, Validators.email])

  private recoverSub?: Subscription
  private servErrSub?: Subscription
  private obsMailSub?: Subscription
  private emailCtrlSub?: Subscription

  send(): void {
    if (this.email.valid && this.turnstileToken()) {
      this.step_12_loading.set(true)
      this.recoverSub = this.accountService.sendForgottenPasswordLink({ email: this.email.value! }, this.turnstileToken()!)
        .subscribe({
          next: ({ obscuredEmail }) => {
            this.step.set(2)
            this.step_12_loading.set(false)
            this.obscuredEmail.set(obscuredEmail!)
          },
          error: (e: HttpErrorResponse) => {
            if ('status' in e && 'error' in e && e.status === 429) {
              this.errMsg.set('Troppi tentativi, riprova tra qualche minuto.')
            }
            this.serverError.set(true)
            this.step_12_loading.set(false)
          }
        })
    }
  }

  onTurnstileToken(token: string): void {
    this.serverError.set(false)
    this.turnstileToken.set(token)
  }

  onTurnstileRender(): void {
    this.loadingTurnstile.set(false)
  }

  ngOnInit(): void {
    this.emailCtrlSub = this.email.valueChanges.subscribe(() => {
      this.serverError.set(false)
      this.errMsg.set('Si è verificato un errore.')
    })
  }

  ngOnDestroy(): void {
    this.recoverSub?.unsubscribe()
    this.servErrSub?.unsubscribe()
    this.obsMailSub?.unsubscribe()
    this.emailCtrlSub?.unsubscribe()
  }

}
