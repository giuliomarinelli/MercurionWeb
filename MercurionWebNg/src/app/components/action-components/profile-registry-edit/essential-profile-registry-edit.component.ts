import { UserGender, UserGenderControl } from './../../../Models/auth/user.models';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ClassicSpinnerComponent } from '../../common/classic-spinner/classic-spinner.component';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of, Subscription, switchMap } from 'rxjs';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { Router } from '@angular/router';
import { AccountService } from '../../../services/account.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ProfileRegistryDTO } from '../../../Models/account/account.models';
import { FloatingInputComponent } from '../../common/floating-input/floating-input.component';
import { PmSelectComponent } from '../../common/pm-select/pm-select.component';
import { PmOption } from '../../../Models/pm-option.model';
import { ProfileRegistryEditContextService } from '../../../services/context/action-context/profile-registry-edit-context.service';

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

<div class="flex justify-center items-center min-h-screen px-2 sm:px-4 m-overlay-screen">
  <div
    class="action-card"
    role="region"
    aria-labelledby="profileRegistryHeading"
    [attr.aria-busy]="step_12_loading() || onStart_loading()"
  >
    <div class="action-card-header">
      <h2
        id="profileRegistryHeading"
        class="text-lg font-semibold text-light-on-surface-main dark:text-dark-on-surface-main"
      >
        Modifica l'anagrafica del profilo
      </h2>
      <button
        type="button"
        class="action-card-close-btn"
        (click)="close()"
        aria-label="Chiudi pannello anagrafica profilo"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-5 h-auto">
          <path d="M182.9 137.4L160.3 114.7L115 160L137.6 182.6L275 320L137.6 457.4L115 480L160.3 525.3L182.9 502.6L320.3 365.3L457.6 502.6L480.3 525.3L525.5 480L502.9 457.4L365.5 320L502.9 182.6L525.5 160L480.3 114.7L457.6 137.4L320.3 274.7L182.9 137.4z"/>
        </svg>
      </button>
    </div>

    <div class="action-card-body bg-light-surface-secondary dark:bg-dark-surface-secondary">
      <div
        class="relative border-b border-light-border dark:border-dark-border min-h-60 transition-[min-height] bg-light-surface-secondary dark:bg-dark-surface-secondary"
        [formGroup]="registryGroup"
        role="form"
        aria-live="polite"
        aria-labelledby="profileRegistryHeading"
      >
        @if (step() === 1) {
          @if (onStart_loading()) {
            <div
              class="absolute inset-0 flex justify-center items-center bg-light-surface-secondary/60 dark:bg-dark-surface-secondary/60"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <m-classic-spinner [size]="45" />
            </div>
          } @else {
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-12 w-full pt-9">
              <m-floating-input
                label="Nome *"
                type="text"
                autocomplete="given-name"
                formControlName="firstName"
                [errors]="{
                  required: 'Il nome è obbligatorio.',
                  pattern: 'Il formato del nome non è valido.'
                }"
                [bgClass]="'bg-light-surface-secondary'"
                [darkBgClass]="'dark:bg-dark-surface-secondary'"
                darkLabelClass="dark:text-dark-accent-secondary-hc"
              />

              <m-floating-input
                label="Cognome *"
                type="text"
                autocomplete="family-name"
                formControlName="lastName"
                [errors]="{
                  required: 'Il cognome è obbligatorio.',
                  pattern: 'Il formato del cognome non è valido.'
                }"
                [bgClass]="'bg-light-surface-secondary'"
                [darkBgClass]="'dark:bg-dark-surface-secondary'"
                darkLabelClass="dark:text-dark-accent-secondary-hc"
              />

              <m-select
                class="relative -top-[30px]"
                label="Genere *"
                [options]="options"
                formControlName="gender"
                darkTextClass="dark:text-dark-accent-secondary-hc"
              />

              <m-floating-input
                label="Il tuo lavoro"
                type="text"
                autocomplete="organization-title"
                formControlName="job"
                [errors]="{}"
                [bgClass]="'bg-light-surface-secondary'"
                [darkBgClass]="'dark:bg-dark-surface-secondary'"
                darkLabelClass="dark:text-dark-accent-secondary-hc"
              />
            </div>
          }
        } @else if (step() === 2 && error()) {
          <div
            class="bg-light-surface-secondary dark:bg-dark-surface-secondary border my-16 border-light-border dark:border-dark-border relative px-4 py-3 mx-auto max-w-[1024px] rounded-lg text-sm flex gap-3 xs:gap-4 items-center flex-col xs:flex-row"
            role="alert"
            aria-live="assertive"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-20 h-auto shrink-[0.5] text-light-error dark:text-dark-error">
              <path d="M320 96C443.7 96 544 196.3 544 320C544 443.7 443.7 544 320 544C196.3 544 96 443.7 96 320C96 196.3 196.3 96 320 96zM320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM419.4 243.2L396.8 220.6L385.5 231.9L320 297.4L254.5 231.9L243.2 220.6L220.6 243.2L231.9 254.5L297.4 320L231.9 385.5L220.6 396.8L243.2 419.4L254.5 408.1L320 342.6L385.5 408.1L396.8 419.4L419.4 396.8L342.6 320L408.1 254.5L419.4 243.2z"/>
            </svg>
            @switch (error()) {
              @case (429) {
                <span>Hai raggiunto il limite massimo di richieste inoltrate al server.&nbsp;Riprova fra alcuni minuti.</span>
              }
              @case (401) {
                <span>Non sei in possesso delle autorizzazioni per compiere questa operazione.</span>
              }
              @default {
                <span>Si è verificato un errore inaspettato. Contatta il supporto se dovesse ripetersi.</span>
              }
            }
          </div>
        }
      </div>
    </div>

    <div class="action-card-footer">
      @if (step() === 1) {
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-light-surface-secondary text-light-on-surface-main dark:bg-slate-200 dark:text-light-on-surface-main hover:bg-white dark:hover:bg-slate-300/80 border border-light-border dark:border-dark-border/80 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-accent-primary-hq focus-visible:ring-offset-2 focus-visible:ring-offset-light-surface-secondary dark:focus-visible:ring-offset-dark-surface-secondary transition-colors duration-200"
          (click)="close()"
          aria-label="Annulla modifica anagrafica"
        >
          Annulla
        </button>

        <button
          type="button"
          title="Resetta"
          class="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-light-surface-secondary text-light-on-surface-main dark:bg-slate-200 dark:text-light-on-surface-main hover:bg-white dark:hover:bg-slate-300/80 border border-light-border dark:border-dark-border/80 shadow-sm disabled:bg-light-surface-secondary disabled:text-slate-300 dark:disabled:bg-slate-200/60 dark:disabled:text-dark-on-surface-secondary/60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-accent-primary-hq focus-visible:ring-offset-2 focus-visible:ring-offset-light-surface-secondary dark:focus-visible:ring-offset-dark-surface-secondary transition-colors duration-200"
          [disabled]="isGroupValueTheSameAsInitialValueSig()"
          (click)="reset()"
          [attr.aria-disabled]="isGroupValueTheSameAsInitialValueSig()"
          aria-label="Reimposta i campi"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current size-5">
            <path d="M544 64L544 183.8L507 144.7C458.5 93.2 390.8 64 320 64C180.3 64 64.1 180.4 64 320C63.9 459.3 180.3 575.9 320 576C420.1 576.1 513.4 515.5 554 424.1L524.8 411.1C489.4 491 407.6 544.1 320.1 544C198 543.9 96 441.6 96.1 320C96.2 198.1 198.1 96 320.1 96C382.1 96 441.3 121.5 483.9 166.6L523 208L400.1 208L400.1 240L576.1 240L576.1 64L544.1 64z"/>
          </svg>
        </button>
      }

      <button
        type="button"
        class="relative inline-flex items-center justify-center px-4 py-2 rounded-lg bg-light-accent-primary-hq text-white font-semibold shadow-md hover:bg-light-accent-primary-hc dark:bg-dark-accent-primary-btn dark:hover:bg-dark-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-accent-primary-hq focus-visible:ring-offset-2 focus-visible:ring-offset-light-surface-secondary dark:focus-visible:ring-offset-dark-surface-secondary disabled:bg-light-accent-primary-hq/50 disabled:cursor-not-allowed transition-colors duration-200 dark:shadow-btn-dark disabled:hover:bg-light-accent-primary-hq/50"
        [disabled]="isGroupValueTheSameAsInitialValueSig() || step_12_loading()"
        [attr.aria-busy]="step_12_loading()"
        (click)="routeAction()"
        [attr.aria-disabled]="isGroupValueTheSameAsInitialValueSig() || step_12_loading()"
        [attr.aria-label]="step() === 1 ? 'Salva anagrafica' : 'Chiudi conferma'"
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
          <m-classic-spinner [size]="24"></m-classic-spinner>
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
  private readonly registryContext = inject(ProfileRegistryEditContextService)

  private readonly registryKeys: (keyof RegistryFormValue)[] = [
    'firstName',
    'lastName',
    'gender',
    'job'
  ]

  options: PmOption[] = [
    {
      label: 'Maschile',
      value: 'M'
    },
    {
      label: 'Femminile',
      value: 'F'
    },
    {
      label: 'Non specificato',
      value: 'Undefined'
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

  private fetchSub?: Subscription
  private upRegSub?: Subscription

  ngOnInit(): void {
    this.fetchSub = of(null).pipe(
      switchMap(() => {
        return this.accountService.getEssentialProfileRegistry().pipe(
          catchError((e: HttpErrorResponse) => {
            this.error.set(e.status)
            this.onStart_loading.set(false)
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
          this.onStart_loading.set(false)
        }
      }
    })
  }

  ngOnDestroy(): void {
    this.fetchSub?.unsubscribe()
    this.upRegSub?.unsubscribe()
  }

  close(): void {
    this.router.navigate(['/settings'], { fragment: 'personal_details' })
    this.actionContext.close()
  }

  reset(): void {
    if (this.initialValue()) {
      const { firstName, lastName, gender, job } = this.initialValue()!
      this.registryGroup.setValue({
        firstName,
        lastName,
        gender: gender as UserGenderControl,
        job: job ?? ''
      })
    }
  }

  routeAction(): void {
    switch (this.step()) {
      case 1:
        this.updateRegistry()
        break
      case 2:
        this.close()
        break
    }
  }

  private updateRegistry(): void {
    this.registryGroup.markAllAsTouched()
    this.registryGroup.updateValueAndValidity()
    if (this.registryGroup.valid) {
      this.error.set(0)
      this.step_12_loading.set(true)
      const dto = this.toProfileRegistryDTO(this.registryGroup)
      this.upRegSub = this.accountService.updateProfileRegistry(dto).pipe(
        finalize(() => queueMicrotask(() => {
          this.step_12_loading.set(false)
        }))
      ).subscribe({
        next: () => queueMicrotask(() => {
          this.registryContext.notifyAdded()
          this.close()
        }),
        error: (e: HttpErrorResponse) => {
          this.error.set(e.status)
          this.step.set(2)
        }
      })
    }
  }

  private isGroupValueTheSameAsInitialValue(): boolean {

    const init = this.initialValue()
    if (!init) return false

    return this.registryKeys.every((key) => {
      const initVal =
        key === 'job'
          ? (init.job ?? '')
          : init[key]

      const formVal = this.registryGroup.controls[key].value

      return initVal === formVal
    })
  }

  private toProfileRegistryDTO(
    group: FormGroup<{
      firstName: FormControl<string>
      lastName: FormControl<string>
      gender: FormControl<UserGenderControl>
      job: FormControl<string>
    }>
  ): ProfileRegistryDTO {

    const { firstName, lastName, gender, job } = group.getRawValue()

    return {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender: this.normalizeGender(gender),
      job: this.normalizeJob(job)
    }
  }

  private normalizeJob(job: string): string | null {
    const trimmed = job.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  private normalizeGender(gender: UserGenderControl): UserGender {
    if (!gender) {
      return 'Undefined'
    }
    return gender as UserGender
  }

}
