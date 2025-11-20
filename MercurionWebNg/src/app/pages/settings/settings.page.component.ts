import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CdkAccordionModule } from '@angular/cdk/accordion';
import { EMPTY, Observable, of, Subscription, switchMap } from 'rxjs';
import { AccountService } from '../../services/account.service';
import { MfaStrategy, ProfileDTO, SessionDTOExt } from '../../Models/account/account.models';
import { ToastService } from '../../services/toast.service';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { Router } from '@angular/router';
import { SessionCardComponent } from '../../components/common/session-card/session-card.component';
import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'm-settings.page',
  imports: [CdkAccordionModule, ClassicSpinnerComponent, SessionCardComponent],
  styles: `

    .accordion-body {
      overflow: hidden;
    }

    /* apertura */
    .accordion-enter {
      animation: accordion-down 180ms linear;
    }

    /* chiusura */
    .accordion-leave {
      animation: accordion-up 150ms ease-in forwards;
    }

    @keyframes accordion-down {
      from {
        transform: translateY(-4px);
        max-height: 0;
      }
      to {
        transform: translateY(0);
        max-height: 999px;
      }
    }

    @keyframes accordion-up {
      from {
        transform: translateY(0);
        max-height: 999px;
      }
      to {
        transform: translateY(-4px);
        max-height: 0;
      }
    }

  `,
  template: `

    @if (!loading())  {
      <section class="main-container">
        <h1 class="mt-4 xs:mt-0 relative bottom-4 text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left text-light-accent-primary dark:text-dark-accent-primary border-b border-slate-300 dark:border-slate-700 pb-6">
          Impostazioni
        </h1>
        <cdk-accordion class="flex flex-col w-full border border-slate-300 dark:border-slate-500">
          @for (item of items; track item; let i = $index) {
            <cdk-accordion-item #accordionItem="cdkAccordionItem">
              <button
                class="w-full p-4 bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-500 text-start flex items-center gap-2"
                [class.border-b]="i !== items.length - 1"
                (click)="accordionItem.toggle()"
                tabindex="0"
                [attr.id]="'accordion-header-' + i"
                [attr.aria-expanded]="accordionItem.expanded"
                [attr.aria-controls]="'accordion-body-' + i">
                @switch (i) {
                    @case (3) {
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto">
                        <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                        <path d="M320 64C373 64 416 107 416 160L416 224L224 224L224 160C224 107 267 64 320 64zM192 160L192 224L128 224L128 576L512 576L512 224L448 224L448 160C448 89.3 390.7 32 320 32C249.3 32 192 89.3 192 160zM160 256L480 256L480 544L160 544L160 256zM336 352L336 336L304 336L304 464L336 464L336 352z"/>
                      </svg>
                    }
                }
                <span>{{ item }}</span>
              </button>
              @if (accordionItem.expanded) {
                <div
                  class="accordion-body px-4 bg-slate-100 dark:bg-slate-700"
                  animate.enter="accordion-enter"
                  animate.leave="accordion-leave"
                  role="region"
                  [attr.id]="'accordion-body-' + i"
                  [attr.aria-labelledby]="'accordion-header-' + i"
                  [class.relative]="i === 1"
                >
                  <div class="py-6">
                    @switch (i) {
                        @case (0) {
                          booooooooooooooh
                        }
                        @case (1) {
                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                            <div class="p-2 sm:p-4">Nome</div>
                            <div class="p-2 sm:p-4"><strong>{{profile.firstName}}</strong></div>
                          </div>
                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                            <div class="p-2 sm:p-4">Cognome</div>
                            <div class="p-2 sm:p-4"><strong>{{profile.lastName}}</strong></div>
                          </div>
                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                            <div class="p-2 sm:p-4">Genere</div>
                            <div class="p-2 sm:p-4"><strong>{{profile.gender}}</strong></div>
                          </div>
                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                            <div class="p-2 sm:p-4">Lavoro</div>
                            <div class="p-2 sm:p-4"><strong>{{profile.job ?? '―'}}</strong></div>
                          </div>
                          <button class="absolute right-6 top-6 cursor-pointer transition-[transform,color] duration-300 hover:scale-[1.075]">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="h-[22px] w-auto fill-current text-slate-800 hover:text-slate-800/75 dark:text-slate-200 dark:hover:text-slate-200/75">
                              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                              <path d="M58.1 555.9L48 592C50.7 591.2 117.4 572.6 248 536L569.4 214.6L592 192C589.6 189.6 549.1 149.1 470.6 70.6L448 48L425.4 70.6L104 392L58.1 555.9zM252.7 486L154 387.3L347.4 193.9L446.1 292.6L252.7 486zM229.4 508L94.2 545.8L132 410.6L229.4 508zM546.7 192L468.6 270.1L369.9 171.4L448 93.3L546.7 192z"/>
                            </svg>
                          </button>
                        }
                        @case (2) {
                          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 relative">
                            <div class="p-2 sm:p-4 sm:col-span-1">E-mail</div>
                            <div class="p-2 sm:p-4 sm:col-span-2 flex justify-between items-center">
                              <strong>{{profile.obscuredEmail}}</strong>
                                <button class="cursor-pointer transition-[transform,color] duration-300 hover:scale-[1.075]">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="h-[22px] w-auto fill-current text-slate-800 hover:text-slate-800/75 dark:text-slate-200 dark:hover:text-slate-200/75">
                                  <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                                  <path d="M58.1 555.9L48 592C50.7 591.2 117.4 572.6 248 536L569.4 214.6L592 192C589.6 189.6 549.1 149.1 470.6 70.6L448 48L425.4 70.6L104 392L58.1 555.9zM252.7 486L154 387.3L347.4 193.9L446.1 292.6L252.7 486zM229.4 508L94.2 545.8L132 410.6L229.4 508zM546.7 192L468.6 270.1L369.9 171.4L448 93.3L546.7 192z"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                            <div class="p-2 sm:p-4 sm:col-span-1">Numero di telefono</div>
                            <div class="p-2 sm:p-4 sm:col-span-2 flex justify-between items-center">
                              <strong>{{profile.obscuredPhone ?? '―'}}</strong>
                                @if (profile.obscuredPhone) {
                                  <button class="cursor-pointer transition-[transform,color] duration-300 hover:scale-[1.075]">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="h-[22px] w-auto fill-current text-slate-800 hover:text-slate-800/75 dark:text-slate-200 dark:hover:text-slate-200/75 transition-colors duration-300">
                                      <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                                      <path d="M58.1 555.9L48 592C50.7 591.2 117.4 572.6 248 536L569.4 214.6L592 192C589.6 189.6 549.1 149.1 470.6 70.6L448 48L425.4 70.6L104 392L58.1 555.9zM252.7 486L154 387.3L347.4 193.9L446.1 292.6L252.7 486zM229.4 508L94.2 545.8L132 410.6L229.4 508zM546.7 192L468.6 270.1L369.9 171.4L448 93.3L546.7 192z"/>
                                    </svg>
                                  </button>
                                } @else {
                                  <button class="cursor-pointer transition-[transform,color] duration-300 hover:scale-[1.075] border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="h-[22px] w-auto fill-current text-slate-800 hover:text-slate-800/75 dark:text-slate-200 dark:hover:text-slate-200/75 transition-colors duration-300">
                                      <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                                      <path d="M336 112L336 96L304 96L304 304L96 304L96 336L304 336L304 544L336 544L336 336L544 336L544 304L336 304L336 112z"/>
                                    </svg>
                                  </button>
                                }
                            </div>
                          </div>
                        }
                        @case (3) {
                          <h3 class="font-bold text-lg my-3">Sessioni attive</h3>
                          <div class="flex flex-col gap-y-4 mb-3">
                            @for (s of activeSessions; track s.id) {
                              <app-session-card [session]="s" (onLoggingOutFromSession)="doLogoutFromSession($event)" />
                            }
                          </div>
                          <button
                            type="button"
                            class="
                              flex items-center gap-2 px-3 py-2 rounded-md
                              bg-light-error
                              text-slate-100 font-medium text-sm
                              hover:bg-light-error/80
                              transition-colors duration-150
                            "
                            (click)="doLogoutFromAllSessions()"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg"
                                 viewBox="0 0 640 640"
                                 class="fill-current h-6 w-6">
                              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                              <path d="M240.1 128L256.1 128L256.1 96L64.1 96L64.1 544L256.1 544L256.1 512L96.1 512L96.1 128L240.1 128zM571.4 331.3L582.7 320L571.4 308.7L427.4 164.7L416.1 153.4L393.5 176L404.8 187.3L521.5 304L224.1 304L224.1 336L521.5 336L404.8 452.7L393.5 464L416.1 486.6L427.4 475.3L571.4 331.3z" />
                            </svg>
                            <span>Esci da tutte le sessioni</span>
                          </button>
                          <hr class="border-[0.5px] border-slate-400 dark:border-slate-500 mt-6" />
                          <h3 class="font-bold text-lg mt-6 mb-3">Autenticazione a più fattori</h3>
                          <p class="pl-3">{{isEnabledMfa ? 'Attiva' : 'Non attiva'}}</p>
                        }
                        @default { ... }
                    }
                  </div>
                </div>
              }
            </cdk-accordion-item>
          }
        </cdk-accordion>

      </section>
    } @else {
      <div class="absolute inset-0">
        <div class="mx-auto max-w-5xl flex justify-center items-center h-full">
          <app-classic-spinner [size]="60" />
        </div>
      </div>
    }
  `
})
export class SettingsPageComponent implements OnInit, OnDestroy {

  private readonly accountService = inject(AccountService)
  private readonly toast = inject(ToastService)
  private readonly router = inject(Router)
  private readonly authService = inject(AuthService)

  pipeStarter$: Observable<null> = of(null)

  profileFetchError = signal<boolean>(false)
  loading = signal<boolean>(true)


  profile!: ProfileDTO
  isEnabledMfa!: boolean
  enabledMfaStrategies!: MfaStrategy[]
  activeSessions!: SessionDTOExt[]

  items = ['Generali', 'Anagrafica', 'Contatti', 'Sicurezza', '...']

  private fetchSub?: Subscription
  private sLoguotSub?: Subscription
  private allLoguotSub?: Subscription

  ngOnInit(): void {
    this.fetchSub = this.accountService.isMfaEnabled().pipe(
      switchMap((ok) => {
        if (!ok) {
          this.isEnabledMfa = false
          return of([])
        }
        this.isEnabledMfa = true
        return this.accountService.getEnabledMfaStrategies()
      }),
      switchMap((str) => {
        this.enabledMfaStrategies = str
        return this.accountService.getActiveSessions()
      }),
      switchMap((s) => {
        this.activeSessions = s.map((s) => ({
          ...s,
          triggerDisappear: signal<boolean>(false)
        }))
        return this.accountService.getProfileRegistry(false)
      })
    ).subscribe({
      next: (profile) => {
        this.profile = profile
        this.loading.set(false)
      },
      error: () => queueMicrotask(() => {
        this.profileFetchError.set(true)
        this.toast.trigger(`Si è verificato un errore nel caricamento delle informazioni dell'account.`)
        this.router.navigateByUrl('/dashboard')
      })
    })
  }

  ngOnDestroy(): void {
    this.fetchSub?.unsubscribe()
    this.sLoguotSub?.unsubscribe()
    this.allLoguotSub?.unsubscribe()
  }

  doLogoutFromSession(ssid: string): void {
    const onError = () => queueMicrotask(() => this.toast.trigger(`Si è verificato un errore. La sessione non è stata eliminata. Contatta il supporto.`, 'error', 3000))
    this.sLoguotSub = this.pipeStarter$.pipe(
      switchMap(() => {
        const s = this.activeSessions.find((s) => s.id === ssid)
        if (!s) {
          onError()
          return EMPTY
        }
        return this.authService.logoutFromSession(ssid, s.current)
      })
    ).subscribe({
      next: () => {
        const s = this.activeSessions.find((s) => s.id === ssid)
        if (!s) {
          onError()
          return
        }
        if (s.current) {
          queueMicrotask(() => this.toast.trigger('Logout dalla sessione corrente effettuato con successo.', 'success', 3000))
        }
        queueMicrotask(() => {
          s.triggerDisappear.set(true)
          setTimeout(() => {
            const i = this.activeSessions.findIndex((s) => s.id === ssid)
            if (i !== -1) {
              this.activeSessions.splice(i, 1)
            }
          }, 350)
        })
      },
      error: () => onError()
    })
  }

  doLogoutFromAllSessions(): void {
    const onError = () => queueMicrotask(() => this.toast.trigger(`Si è verificato un errore. Le sessioni non sono state eliminate. Contatta il supporto.`, 'error', 3000))
    this.allLoguotSub = this.authService.logoutFromAllSessions().subscribe({
      next: () => queueMicrotask(() => this.toast.trigger('Logout da tutte le sessioni effetttuato con successo.', 'success', 3000)),
      error: () => onError()
    })
  }

}
