import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccountService } from '../../services/account.service';
import { catchError, distinctUntilChanged, EMPTY, filter, of, Subscription, switchMap, take, tap } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FloatingInputComponent } from '../../components/common/floating-input/floating-input.component';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { matchPassword } from '../../custom-validators';
import { ErrorRes } from '../../Models/confirm.models';
import { UserContextService } from '../../services/context/user-context.service';
import { Helpers } from '../../helpers';

@Component({
  selector: 'm-password-recovery',
  imports: [
    ReactiveFormsModule,
    FloatingInputComponent,
    ClassicSpinnerComponent,
    RouterLink
  ],
  template: `
    @if (canView()) {
      @switch (step()) {
        @case (1) {
          <h1 class="text-2xl mt-2 2xs:text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center text-light-accent-primary dark:text-dark-accent-primary">
            Recupero password
          </h1>
          <div class="bg-slate-200 dark:bg-slate-800 border my-16 border-slate-300 dark:border-slate-600 relative p-3 mx-auto max-w-[1024px] rounded-md text-sm flex gap-2 xs:gap-4 items-center flex-col xs:flex-row">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current size-16 shrink-[0.5]">
              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path d="M320 96C443.7 96 544 196.3 544 320C544 443.7 443.7 544 320 544C196.3 544 96 443.7 96 320C96 196.3 196.3 96 320 96zM320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM272 416L256 416L256 448L384 448L384 416L336 416L336 288L256 288L256 320L304 320L304 416L272 416zM344 248L344 200L296 200L296 248L344 248z"/>
            </svg>
            <span>Inserisci la tua nuova password.
            </span>
          </div>
            <form (ngSubmit)="send()" [formGroup]="form" class="mt-2 max-w-[400px] mx-auto">
              <m-floating-input class="mb-3 block"
                label="Nuova password"
                type="password"
                formControlName="password"
                [errors]="{
                  required: 'Campo obbligatorio.'
                }"
                (enter)="send()"
              />

              <m-floating-input
                label="Ripeti la nuova password"
                type="password"
                formControlName="confirmPassword"
                [errors]="{
                  required: 'Campo obbligatorio.',
                  matchPassword: 'Le due password non corrispondono.'
                }"
                [serverError]="
                  serverError() ? serverErrorMsg() : null
                "
                (enter)="send()"
              />

              <button
                type="submit"
                [disabled]="form.invalid || step_12_loading() || serverError()"
                class="relative top-[10px] w-full py-2 text-white rounded-md transition-colors duration-150 bg-light-accent-primary dark:bg-dark-accent-primary-btn hover:bg-light-accent-primary/80 dark:hover:bg-dark-accent-primary/80 disabled:bg-light-accent-primary/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary/60 disabled:hover:dark:bg-dark-accent-primary/80"
              >
              @if (!step_12_loading()) {
                @if (!serverError()) {
                  Cambia password
                } @else {
                  <div class="text-slate-200 flex items-center justify-center gap-3">
                    <span>Redirecting...</span>
                    <m-classic-spinner [size]="24" />
                  </div>
                }
              } @else {
                <div class="text-slate-200 flex items-center justify-center">
                  <m-classic-spinner [size]="24" />
                </div>

              }
              </button>
            </form>
          }
          @case (2) {
            <div class="bg-slate-200 dark:bg-slate-800 border my-16 border-slate-300 dark:border-slate-600 relative p-3 mx-auto max-w-[1024px] rounded-md text-sm flex gap-2 xs:gap-4 items-center flex-col xs:flex-row">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current size-16 shrink-[0.5] text-emerald-800 dark:text-emerald-400">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 96C196.3 96 96 196.3 96 320C96 443.7 196.3 544 320 544C443.7 544 544 443.7 544 320C544 196.3 443.7 96 320 96zM438.3 236.5L428.9 249.4L300.9 425.4L289.9 440.6L201.3 352L223.9 329.4L286 391.5L403 230.7L412.4 217.8L438.3 236.6z" />
              </svg>
              <span>La password è stata cambiata con successo! <a class="text-light-accent-primary dark:text-dark-accent-primary hover:underline" routerLink="/login">Vai al login</a>.
              </span>
            </div>
          }
      }
    }
  `
})
export class PasswordRecoveryPageComponent implements OnInit, OnDestroy {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly accountService = inject(AccountService);
  private readonly fb = inject(FormBuilder)
  private readonly userCtx = inject(UserContextService)

  private changePasswordToken = signal<string>('');
  private recoverySub?: Subscription;
  private paramSub?: Subscription;
  private sendSub?: Subscription;
  private valChSub?: Subscription
  private valChSub2?: Subscription

  step = signal<1 | 2>(1)
  canView = signal(false)
  step_12_loading = signal<boolean>(false)
  serverError = signal<boolean>(false)
  serverErrorMsg = signal<string>('Si è verificato un errore')

  form = this.fb.group({
    password: [null, [Validators.required, Validators.minLength(8)]],
    confirmPassword: [null, [Validators.required, matchPassword]],
  })

  private sanitizeToken(raw: string) {
    return decodeURIComponent(raw).replace(/[\s\u00A0\u200B-\u200D\uFEFF]/g, '');
  }

  ngOnInit(): void {
    this.valChSub = this.form.get('password')?.valueChanges.subscribe(() => {
      this.form.get('confirmPassword')?.updateValueAndValidity({ onlySelf: true });
    })
    this.valChSub2 = this.form.valueChanges.subscribe(() => this.serverError.set(false))
    this.recoverySub = of(null).pipe(
      tap(() => {
        this.userCtx.logout()
      }),
      switchMap(() => this.route.fragment.pipe(
        filter((frag): frag is string => !!frag),
        take(1),
        switchMap((frag) => {

          const raw = new URLSearchParams(frag).get('t') ?? ''
          const t = this.sanitizeToken(raw)

          if (!t || !Helpers.isValidJwt(t)) {
            this.router.navigateByUrl('/404-not-found')
            return EMPTY
          }

          this.changePasswordToken.set(t)

          this.router.navigate([], {
            relativeTo: this.route,
            replaceUrl: true,
            fragment: undefined
          })

          queueMicrotask(() => {
            if (location.hash) {
              history.replaceState({}, '', location.pathname + location.search)
            }
          })

          return of(t)

        })
      )
      ),
      switchMap((t) => this.accountService.isAuthorizedToRecoverPassword(t).pipe(
        take(1),
        switchMap((ok) => {
          if (!ok) {
            this.router.navigateByUrl('/404-not-found')
            return EMPTY
          }
          this.canView.set(true)
          return EMPTY
        }),
        catchError(() => {
          this.router.navigateByUrl('/404-not-found')
          return EMPTY
        })
      )
      ),
      catchError(() => {
        this.router.navigateByUrl('/404-not-found')
        return EMPTY
      })
    ).subscribe()
  }

  send(): void {
    if (this.form.valid) {
      this.step_12_loading.set(true)
      this.sendSub = this.accountService.recoverPassword({ newPassword: this.form.controls['password'].value! }, this.changePasswordToken())
        .subscribe({
          next: () => {
            this.step.set(2)
            this.step_12_loading.set(false)
          },
          error: (e: { error: ErrorRes, status: number }) => {
            console.log(e)
            this.serverError.set(true)
            this.step_12_loading.set(false)
            if (e.status === 403 && e.error.message === 'PasswordReused') {
              this.serverErrorMsg.set('Impossibile salvare una password già utilizzata')
            }
            setTimeout(() => this.router.navigateByUrl('/forgot-password'), 3000)
          }
        })
    }
  }

  ngOnDestroy(): void {
    this.recoverySub?.unsubscribe()
    this.paramSub?.unsubscribe()
    this.sendSub?.unsubscribe()
    this.valChSub?.unsubscribe()
    this.valChSub2?.unsubscribe()
  }
}
