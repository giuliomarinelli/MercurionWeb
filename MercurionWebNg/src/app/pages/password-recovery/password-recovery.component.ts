import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccountService } from '../../services/account.service';
import { Subscription } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FloatingInputComponent } from '../../components/common/floating-input/floating-input.component';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { matchPassword } from '../../custom-validators';

@Component({
  selector: 'app-password-recovery',
  standalone: true,
  imports: [ReactiveFormsModule, FloatingInputComponent, ClassicSpinnerComponent, RouterLink],
  template: `
    @if (canView()) {
      @switch (step()) {
        @case (1) {
          <h1 class="text-2xl mt-2 2xs:text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center text-light-accent-primary dark:text-dark-accent-primary">
            Recupero password
          </h1>
          <div class="bg-slate-200 dark:bg-slate-800 border my-16 border-slate-300 dark:border-slate-600 relative p-3 mx-auto max-w-[1024px] rounded-md text-sm flex gap-2 xs:gap-4 items-center flex-col xs:flex-row">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-20 h-auto shrink-[0.5]">
              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.--><path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 128C214 128 128 214 128 320C128 426 214 512 320 512C426 512 512 426 512 320C512 214 426 128 320 128zM348 388L380 388L380 444L260 444L260 388L292 388L292 348L260 348L260 292L348 292L348 388zM320 264C297.9 264 280 246.1 280 224C280 201.9 297.9 184 320 184C342.1 184 360 201.9 360 224C360 246.1 342.1 264 320 264z"/>
            </svg>
            <span>Inserisci la tua nuova password.
            </span>
          </div>
            <form (ngSubmit)="send()" [formGroup]="form" class="mt-2 max-w-[400px] mx-auto">
              <app-floating-input class="mb-5 block"
                label="Nuova password"
                type="password"
                formControlName="password"
                [errors]="{
                  required: 'Campo obbligatorio.'
                }"
                (enter)="send()"
              />

              <app-floating-input
                label="Ripeti la nuova password"
                type="password"
                formControlName="confirmPassword"
                [errors]="{
                  required: 'Campo obbligatorio.',
                  matchPassword: 'Le due password non corrispondono.'
                }"
                [serverError]="
                  serverError() ? 'Si è verificato un errore' : null
                "
                (enter)="send()"
              />

              <button
                type="submit"
                (click)="send()"
                [disabled]="form.invalid || step_12_loading()"
                class="relative top-[10px] w-full py-2 text-white rounded-md transition-colors duration-150 bg-light-accent-primary dark:bg-dark-accent-primary-btn hover:bg-light-accent-primary/80 dark:hover:bg-dark-accent-primary/80 disabled:bg-light-accent-primary/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary/60 disabled:hover:dark:bg-dark-accent-primary/80"
              >
              @if (!step_12_loading()) {
                Cambia password
              } @else {
                <div class="text-slate-200 flex items-center justify-center">
                  <app-classic-spinner [size]="24" />
                </div>

              }
              </button>
            </form>
          }
          @case (2) {
            <div class="bg-slate-200 dark:bg-slate-800 border my-16 border-slate-300 dark:border-slate-600 relative p-3 mx-auto max-w-[1024px] rounded-md text-sm flex gap-2 xs:gap-4 items-center flex-col xs:flex-row">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-20 h-auto shrink-[0.5] text-emerald-800 dark:text-emerald-400">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 128C214 128 128 214 128 320C128 426 214 512 320 512C426 512 512 426 512 320C512 214 426 128 320 128zM439.6 272L419.8 291.8L307.8 403.8C296.9 414.7 279.1 414.7 268.2 403.8C231.5 367.1 208.9 344.5 200.4 336L240 296.4C251.8 308.2 267.8 324.2 288 344.4L380.2 252.2L400 232.4L439.6 272z"/>
              </svg>
              <span>La password è stata cambiata con successo! <a class="text-light-accent-primary dark:text-dark-accent-primary hover:underline" routerLink="/login">Vai al login</a>.
              </span>
            </div>
          }
      }
    }
  `
})
export class PasswordRecoveryComponent implements OnInit, OnDestroy {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly accountService = inject(AccountService);
  private readonly fb = inject(FormBuilder)

  private changePasswordToken = signal<string>('');
  private authSub?: Subscription;
  private paramSub?: Subscription;
  private sendSub?: Subscription;
  private valChSub?: Subscription
  private valChSub2?: Subscription

  step = signal<1 | 2>(1)
  canView = signal(false)
  step_12_loading = signal<boolean>(false)
  serverError = signal<boolean>(false)

  form = this.fb.group({
    password: [null, [Validators.required, Validators.minLength(8)]],
    confirmPassword: [null, [Validators.required, matchPassword]],
  })

  private sanitizeToken(raw: string) {
    // decode + rimuovi spazi, NBSP, zero-width, ecc.
    return decodeURIComponent(raw).replace(/[\s\u00A0\u200B-\u200D\uFEFF]/g, '');
  }

  private isValidJwt(t: string) {
    return /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){2}$/.test(t);
  }

  ngOnInit(): void {
    this.valChSub = this.form.get('password')?.valueChanges.subscribe(() => {
      this.form.get('confirmPassword')?.updateValueAndValidity({ onlySelf: true });
    })
    this.valChSub2 = this.form.valueChanges.subscribe(() => this.serverError.set(false))
    const raw = this.route.snapshot.queryParamMap.get('t') ?? '';
    const t = this.sanitizeToken(raw);
    if (!t || !this.isValidJwt(t)) {
      this.router.navigateByUrl('/')
      return
    }

    this.changePasswordToken.set(t);
    this.authSub = this.accountService.isAuthorizedToRecoverPassword(t)
      .subscribe({
        next: ok => ok ? this.canView.set(true) : this.router.navigateByUrl('/'),
        error: () => this.router.navigateByUrl('/')
      });
  }

  send(): void {
    if (this.form.valid) {
      this.sendSub = this.accountService.recoverPassword({ newPassword: this.form.controls['password'].value! }, this.changePasswordToken())
        .subscribe({
          next: () => this.step.set(2),
          error: () => this.serverError.set(true)
        })
    }
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe()
    this.paramSub?.unsubscribe()
    this.sendSub?.unsubscribe()
    this.valChSub?.unsubscribe()
    this.valChSub2?.unsubscribe()
  }
}
