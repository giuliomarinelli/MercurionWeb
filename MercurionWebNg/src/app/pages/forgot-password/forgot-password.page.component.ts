import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FloatingInputComponent } from '../../components/common/floating-input/floating-input.component';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountService } from '../../services/account.service';
import { Subscription } from 'rxjs';
import { TurnstileComponent } from '../../components/common/turnstile/turnstile.component';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';

@Component({
  selector: 'app-forgot-password',
  imports: [FloatingInputComponent, ReactiveFormsModule, TurnstileComponent, ClassicSpinnerComponent],
  template: `

    <h1 class="text-2xl mt-2 2xs:text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center text-light-accent-primary dark:text-dark-accent-primary">
        Recupero password
    </h1>
    @switch (step()) {
      @case (1) {
        <div class="bg-slate-200 dark:bg-slate-800 border my-16 border-slate-300 dark:border-slate-600 relative p-3 mx-auto max-w-[1024px] rounded-md text-sm flex gap-2 xs:gap-4 items-center flex-col xs:flex-row">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-20 h-auto shrink-[0.5]">
            <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.--><path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 128C214 128 128 214 128 320C128 426 214 512 320 512C426 512 512 426 512 320C512 214 426 128 320 128zM348 388L380 388L380 444L260 444L260 388L292 388L292 348L260 348L260 292L348 292L348 388zM320 264C297.9 264 280 246.1 280 224C280 201.9 297.9 184 320 184C342.1 184 360 201.9 360 224C360 246.1 342.1 264 320 264z"/>
          </svg>
          <span>Inserisci il tuo indirizzo e-mail e clicca su <strong>Recupera</strong>. Ti invieremo una mail con un link valido una sola volta
            e per pochi minuti dal quale potrai impostare una nuova password.
          </span>
        </div>
        <!-- STEP 1: EMAIL -->
        <div class="mt-2 max-w-[400px] mx-auto">
          <app-floating-input
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
          />

          <button
            type="button"
            (click)="send()"
            [disabled]="email.invalid || !turnstileToken() || step_12_loading()"
            class="relative top-[10px] w-full py-2 text-white rounded-md transition-colors duration-150 bg-light-accent-primary dark:bg-dark-accent-primary-btn hover:bg-light-accent-primary/80 dark:hover:bg-dark-accent-primary/80 disabled:bg-light-accent-primary/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary/60 disabled:hover:dark:bg-dark-accent-primary/80"
          >
            @if (!step_12_loading()) {
              Recupera
            } @else {
              <div class="text-slate-200 flex items-center justify-center">
                <app-classic-spinner [size]="24"></app-classic-spinner>
              </div>

            }
          </button>
          <div class="flex justify-center mt-10">
            @if (loadingTurnstile()) {
              <div
                class="w-[300px] h-[71px] overflow-hidden transition-all bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 animate-pulse skeleton-pulse"
              >
                <span class="sr-only">Loading CAPTCHA…</span>
              </div>
            }
            <app-turnstile
              (token)="onTurnstileToken($event)"
              (widgetReady)="onTurnstileRender()"
              (refresh)="loadingTurnstile.set(true)"
              class="block h-[71px] mt-1"
            />
          </div>
        </div>
      }
      @case (2) {
        <div class="bg-slate-200 dark:bg-slate-800 border my-16 border-slate-300 dark:border-slate-600 relative p-3 mx-auto max-w-[1024px] rounded-md text-sm flex gap-2 xs:gap-4 items-center flex-col xs:flex-row">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-20 h-auto shrink-[0.5] text-emerald-800 dark:text-emerald-400">
            <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 128C214 128 128 214 128 320C128 426 214 512 320 512C426 512 512 426 512 320C512 214 426 128 320 128zM439.6 272L419.8 291.8L307.8 403.8C296.9 414.7 279.1 414.7 268.2 403.8C231.5 367.1 208.9 344.5 200.4 336L240 296.4C251.8 308.2 267.8 324.2 288 344.4L380.2 252.2L400 232.4L439.6 272z"/>
          </svg>
          <span>Un'e-mail con un link per creare una nuova password è stata inviata a <strong class="text-light-accent-primary dark:text-dark-accent-primary">{{obscuredEmail()}}</strong>. Il link è valido una volta sola e soltanto per pochi minuti!
          </span>
        </div>
      }
    }

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
          error: (e) => {
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
