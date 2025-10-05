import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FloatingInputComponent } from '../../components/common/floating-input/floating-input.component';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountService } from '../../services/account.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-forgot-password',
  imports: [FloatingInputComponent, ReactiveFormsModule],
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
              serverError() ? 'Si è verificato un errore' : null
            "
            (enter)="send()"
          />

          <button
            type="button"
            (click)="send()"
            [disabled]="email.invalid"
            class="relative top-[10px] w-full py-2 text-white rounded-md transition-colors duration-150 bg-light-accent-primary dark:bg-dark-accent-primary-btn hover:bg-light-accent-primary/80 dark:hover:bg-dark-accent-primary/80 disabled:bg-light-accent-primary/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary/60 disabled:hover:dark:bg-dark-accent-primary/80"
          >
            Recupera
          </button>
        </div>
      }
      @case (2) {
        blaaaaaaa
      }
    }

  `

})
export class ForgotPasswordComponent implements OnInit, OnDestroy {

  private readonly accountService = inject(AccountService)

  private recoverSub?: Subscription
  private servErrSub?: Subscription

  step = signal<1 | 2>(1)
  serverError = signal<boolean>(false)
  email = new FormControl<string | null>(null, [Validators.required, Validators.email])


  send(): void {
    if (this.email.valid) {
      this.recoverSub = this.accountService.sendForgottenPasswordLink({ email: this.email.value! })
        .subscribe({
          next: (res) => {
            this.step.set(2)
          },
          error: () => {
            this.serverError.set(true)
          }
        })
    }
  }

  ngOnInit(): void {
    this.email.valueChanges.subscribe(() => this.serverError.set(false))
  }

  ngOnDestroy(): void {
    this.recoverSub?.unsubscribe()
    this.servErrSub?.unsubscribe()
  }

}
