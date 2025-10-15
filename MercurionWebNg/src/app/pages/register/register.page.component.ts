import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { PublicPipe } from '../../pipes/public.pipe';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { ThemeManagerService } from '../../services/context/theme-manager.service';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/context/user-context.service';
import { environment } from '../../../environments/environment.development';
import { Subscription } from 'rxjs';
import { FloatingInputComponent } from '../../components/common/floating-input/floating-input.component';
import { PmOption, PmSelectComponent } from '../../components/common/pm-select/pm-select.component';

@Component({
  selector: 'app-register.page',
  imports: [
    PublicPipe,
    ReactiveFormsModule,
    FloatingInputComponent,
    PmSelectComponent
  ],
  template: `

    @if (userContext.isLoggedOut()) {
      <div class="main-container min-h-screen max-w-[425px] sm:max-w-4xl">
        <div class="flex flex-col items-center px-4 pt-3">
          <img
            [src]="logoSrc() | public"
            alt="Mercurion Logo"
            class="w-16 h-auto mb-6"
          />

          <!-- Welcome Message -->
          <h1
            class="text-2xl font-semibold text-light-accent-secondary dark:text-dark-accent-secondary text-center"
          >
            Registrati a Mercurion.
          </h1>
        </div>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
            <app-floating-input
                label="Nome"
                type="text"
                autocomplete="current-name"
                formControlName="firstName"
                [errors]="{
                  required: 'Il nome è obbligatorio.',
                  pattern: 'Il formato del nome non è valido.'
                }"
            />
            <app-floating-input
                label="Cognome"
                type="text"
                autocomplete="current-surname"
                formControlName="lastName"
                [errors]="{
                  required: 'Il cognome è obbligatorio.',
                  pattern: 'Il formato del cognome non è valido.'
                }"
            />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
            <app-floating-input
                label="Nome"
                type="text"
                autocomplete="current-name"
                formControlName="email"
                [errors]="{
                  required: 'Il nome è obbligatorio.',
                  pattern: 'Il formato del nome non è valido.'
                }"
            />
            <app-floating-input
                label="Cognome"
                type="text"
                autocomplete="current-surname"
                formControlName="job"
                [errors]="{
                  required: 'Il cognome è obbligatorio.',
                  pattern: 'Il formato del cognome non è valido.'
                }"
            />
          </div>
          <!-- <div class="flex justify-center mx-auto max-w-[500px]">
            <div class="w-full">
              <label for="location" class="block ml-[2px] mb-2 text-base text-light-accent-secondary dark:text-dark-accent-secondary/90">
                Genere
              </label>
              <div class="relative">
                <select id="location" name="location"
                  class="w-full appearance-none text-lg text-slate-600 outline outline-1 -outline-offset-1 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-light-accent-primary dark:bg-transparent dark:text-slate-400 dark:*:bg-slate-800 dark:focus-visible:outline-dark-accent-primary hover:bg dark:hover:bg-neutral-800/50 hover:bg-slate-100/60
                  block p-4 border border-slate-300 dark:border-slate-200 rounded-md transition duration-300
                  focus:outline-none focus:ring-2 focus:ring-light-accent-primary dark:focus:ring-dark-accent-primary
                  focus:border-light-accent-primary dark:focus:border-dark-accent-primary cursor-pointer">
                  <option class="cursor-pointer text-lg p-4">United States</option>
                  <option selected>Canada</option>
                  <option>Mexico</option>
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 dark:text-slate-200">
                  !Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.
                  <path d="M536 224L320 456L104 224L536 224z"/>
                </svg>
              </div>
            </div>
          </div> -->
          <pm-select label="Genere"
           [options]="options"
           formControlName="location">
          </pm-select>




        </form>
      </div>
    }


  `
})
export class RegisterPageComponent implements OnInit, OnDestroy {

  // ======================= DEPS =======================
  private readonly fb = inject(FormBuilder)
  private readonly themeManager = inject(ThemeManagerService)
  private readonly authService = inject(AuthService)
  protected readonly userContext = inject(UserContextService)
  // ====================================================

  private regSub?: Subscription

  step = signal<1 | 2>(1)
  logoSrc = computed(() => {
    const { PICTOGRAM_LIKE, PICTOGRAM_DARK } = environment.logoSrc
    return this.themeManager.theme() === 'light' ? PICTOGRAM_LIKE : PICTOGRAM_DARK
  })
  form = this.fb.group({
    firstName: this.fb.control(null, [Validators.required, Validators.pattern(/^[A-ZÀ-Ýa-zà-ÿ\s]+$/)]),
    lastName: this.fb.control(null, [Validators.required, Validators.pattern(/^[A-ZÀ-Ýa-zà-ÿ\s]+$/)]),
    email: this.fb.control(null, [Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)]),
    job: this.fb.control(null, Validators.pattern(/^[A-ZÀ-Ýa-zà-ÿ0-9\s]+$/)),
    gender: this.fb.control('None'),
    password: this.fb.control(null, [Validators.required, Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/)])
  })

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
    },
  ]

  onSubmit(): void {

  }

  ngOnInit(): void {

  }

  ngOnDestroy(): void {

  }

}
