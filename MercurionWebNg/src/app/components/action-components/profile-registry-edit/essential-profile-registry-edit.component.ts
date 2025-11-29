import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ClassicSpinnerComponent } from '../../common/classic-spinner/classic-spinner.component';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of, Subscription, switchMap, tap } from 'rxjs';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { Router } from '@angular/router';
import { UserGenderControl } from '../../../Models/auth/user.models';
import { AccountService } from '../../../services/account.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ProfileRegistryDTO } from '../../../Models/account/account.models';
import { FloatingInputComponent } from '../../common/floating-input/floating-input.component';
import { PmSelectComponent } from '../../common/pm-select/pm-select.component';
import { PmOption } from '../../../Models/pm-option.model';

type RegistryFormValue = {
  firstName: string
  lastName: string
  gender: UserGenderControl
  job: string
}

@Component({
  selector: 'm-essential-profile-registry-edit',
  imports: [
    ClassicSpinnerComponent,
    ReactiveFormsModule,
    FloatingInputComponent,
    PmSelectComponent
  ],
  template: `

<div class="flex justify-center items-center min-h-screen px-2">
  <div class="w-full max-w-5xl bg-white dark:bg-dark-surface-main rounded-xl shadow-lg">
    <div class="flex items-center justify-between px-4 py-4 border-b border-b-slate-400 sticky top-0 z-50 rounded-t-xl bg-white dark:bg-dark-surface-main">
      <h2 class="text-lg font-semibold">Modifica l'anagrafica del profilo</h2>
      <button class="inline-flex items-center justify-center size-8 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-transparent transition" (click)="close()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-5 h-auto">
          <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path d="M182.9 137.4L160.3 114.7L115 160L137.6 182.6L275 320L137.6 457.4L115 480L160.3 525.3L182.9 502.6L320.3 365.3L457.6 502.6L480.3 525.3L525.5 480L502.9 457.4L365.5 320L502.9 182.6L525.5 160L480.3 114.7L457.6 137.4L320.3 274.7L182.9 137.4z"/>
        </svg>
      </button>
    </div>
    <div class="mx-auto">
      <div
        class="mt-6 px-6 pb-6 border-b border-spacing-y-[0.3px]"
        [formGroup]="registryGroup">
        @if (step() === 1) {
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-12 w-full px-3 pt-9">
            <app-floating-input
              label="Nome *"
              type="text"
              autocomplete="current-name"
              formControlName="firstName"
              [errors]="{
                required: 'Il nome è obbligatorio.',
                pattern: 'Il formato del nome non è valido.'
              }"
              bgClass="bg-white"
              darkBgClass="dark:bg-dark-surface-main" />

            <app-floating-input
              label="Cognome *"
              type="text"
              autocomplete="current-surname"
              formControlName="lastName"
              [errors]="{
                required: 'Il cognome è obbligatorio.',
                pattern: 'Il formato del cognome non è valido.'
              }"
              bgClass="bg-white"
              darkBgClass="dark:bg-dark-surface-main" />

            <!-- Genere sotto e largo come 2 colonne -->
            <pm-select
              class="relative -top-[30px]"
              label="Genere *"
              [options]="options"
              formControlName="gender" />

            <app-floating-input
              label="Il tuo lavoro"
              type="text"
              autocomplete="current-job"
              formControlName="job"
              [errors]="{}"
              bgClass="bg-white"
              darkBgClass="dark:bg-dark-surface-main" />

          </div>
        } @else if (step() === 2) {
          <!-- Step 2 template qui -->
        }
      </div>
    </div>
    <div class="my-4 mr-8 flex justify-end gap-2">
      @if (step() === 1) {
        <button
          type="button"
          class="px-4 py-2 rounded bg-slate-200 text-light-on-surface-main dark:bg-slate-100 dark:text-neutral-950 hover:bg-gray-300"
          (click)="close()"
        >
          Annulla
        </button>
      }
      <button
        type="button"
        class="relative inline-flex items-center justify-center px-4 py-2 rounded bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed"
        [disabled]="isGroupValueTheSameAsInitialValueSig()"
        [attr.aria-busy]="step_12_loading()"
      >
        <span [class.invisible]="step_12_loading()">
          @if (step() === 1) {
            <span>Salva</span>
          } @else if (step() === 2) {
            <span>Ok</span>
          }
        </span>

        <span
          aria-hidden="true"
          class="absolute inset-0 flex items-center justify-center"
          [class.hidden]="!step_12_loading()"
        >
          <app-classic-spinner [size]="24"></app-classic-spinner>
        </span>
      </button>
    </div>
  </div>
</div>

  `
})
export class EssentialProfileRegistryEditComponent implements OnInit, OnDestroy {

  private readonly actionContext = inject(ActionOverlayContextService)
  private readonly router = inject(Router)
  private readonly fb = inject(NonNullableFormBuilder)
  private readonly accountService = inject(AccountService)

  private readonly registryKeys: (keyof RegistryFormValue)[] = [
    'firstName',
    'lastName',
    'gender',
    'job'
  ]

  options: PmOption[] = [
      {
        label: 'Maschile',
        value: 'M',
      },
      {
        label: 'Femminile',
        value: 'F',
      },
      {
        label: 'Non specificato',
        value: 'Undefined',
      }
    ]

  step = signal<1 | 2>(1)
  step_12_loading = signal<boolean>(false)
  onStart_loading = signal<boolean>(true)
  error = signal<number>(0)
  initialValue = signal<ProfileRegistryDTO | null>(null)
  isGroupValueTheSameAsInitialValueSig = signal<boolean>(false)

  registryGroup = this.fb.group({
    firstName: this.fb.control('', [Validators.required, Validators.pattern(/^[A-ZÀ-Ýa-zà-ÿ\s]+$/)]),
    lastName: this.fb.control('', [Validators.required, Validators.pattern(/^[A-ZÀ-Ýa-zà-ÿ\s]+$/)]),
    gender: this.fb.control<UserGenderControl>('', [Validators.required]),
    job: this.fb.control('', Validators.pattern(/^(?:[A-Za-zÀ-Ýà-ÿ]+(?:\s+[A-Za-zÀ-Ýà-ÿ]+)*)?$/))
  })

  private formSub?: Subscription
  private fetchSub?: Subscription
  private regSub?: Subscription

  ngOnInit(): void {
    this.fetchSub = of(null).pipe(
      finalize(() => this.onStart_loading.set(false)),
      switchMap(() => {
        return this.accountService.getEssentialProfileRegistry().pipe(
          catchError((e: HttpErrorResponse) => {
            this.error.set(e.status)
            return of(null)
          })
        )
      }),
      switchMap((res) => {
        if (res) {
          const { firstName, lastName, gender, job } = res
          queueMicrotask(() => {
            this.initialValue.set(res)
            this.registryGroup.controls['firstName'].setValue(firstName)
            this.registryGroup.controls['lastName'].setValue(lastName)
            this.registryGroup.controls['gender'].setValue(gender as UserGenderControl)
            this.registryGroup.controls['job'].setValue(job ?? '')
          })
          return this.registryGroup.valueChanges
        }
        return of(null)
      })
    ).subscribe({
      next: (res) => {
        if (res) {
          this.isGroupValueTheSameAsInitialValueSig.set(this.isGroupValueTheSameAsInitialValue())
          console.log(this.isGroupValueTheSameAsInitialValueSig())
        }
      }
    })
  }

  ngOnDestroy(): void {
    this.formSub?.unsubscribe()
    this.fetchSub?.unsubscribe()
    this.regSub?.unsubscribe()
  }

  close(): void {
    this.router.navigate(['/settings'], { fragment: 'personal_details' })
    this.actionContext.close()
  }

  isGroupValueTheSameAsInitialValue(): boolean {
    const init = this.initialValue()
    if (!init) return false;

    return this.registryKeys.every((key) => {
      const initVal =
        key === 'job'
          ? (init.job ?? '')
          : init[key]

      const formVal = this.registryGroup.controls[key].value

      return initVal === formVal
    })
  }

}
