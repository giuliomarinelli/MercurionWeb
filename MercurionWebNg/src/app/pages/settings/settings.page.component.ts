import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CdkAccordionModule } from '@angular/cdk/accordion';
import { of, Subscription, switchMap } from 'rxjs';
import { AccountService } from '../../services/account.service';
import { MfaStrategy, ProfileDTO } from '../../Models/account/account.models';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'm-settings.page',
  imports: [CdkAccordionModule],
  template: `

    <section class="main-container">
      <h1 class="mt-4 xs:mt-0 relative bottom-4 text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left text-light-accent-primary dark:text-dark-accent-primary border-b border-slate-300 dark:border-slate-700 pb-6">
        Impostazioni
      </h1>
      <cdk-accordion class="flex flex-col w-full border border-slate-300 dark:border-slate-500">
        @for (item of items; track item; let i = $index) {
          <cdk-accordion-item #accordionItem="cdkAccordionItem">
            <button
              class="w-full p-4 bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-500 text-start"
              [class.border-b]="i !== items.length - 1"
              (click)="accordionItem.toggle()"
              tabindex="0"
              [attr.id]="'accordion-header-' + i"
              [attr.aria-expanded]="accordionItem.expanded"
              [attr.aria-controls]="'accordion-body-' + i">
              {{ item }}
            </button>
            @if(accordionItem.expanded) {
              <div
                class="px-4 py-8 bg-slate-100 dark:bg-slate-700"
                role="region"
                [style.display]="accordionItem.expanded ? '' : 'none'"
                [attr.id]="'accordion-body-' + i"
                [attr.aria-labelledby]="'accordion-header-' + i"
              >
                @switch (i) {
                  @case (0) {
                    Lorem ipsum dolor, sit amet, consectetur adipisicing elit. Perferendis excepturi incidunt ipsum
                deleniti labore, tempore non nam doloribus blanditiis veritatis illo autem iure aliquid ullam
                rem tenetur deserunt velit culpa?
                  }
                  @default {
                    none
                  }
                }

              </div>
            }
          </cdk-accordion-item>
        }
      </cdk-accordion>
    </section>
  `
})
export class SettingsPageComponent implements OnInit, OnDestroy {

  private readonly accountService = inject(AccountService)
  private readonly toast = inject(ToastService)


  profileFetchError = signal<boolean>(false)

  profile!: ProfileDTO
  isEnabledMfa!: boolean
  enabledMfaStrategies!: MfaStrategy[]

  items = ['Generali', 'Anagrafica', 'Contatti', 'Sicurezza', '...']

  private fetchSub?: Subscription

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
        return this.accountService.getProfileRegistry(false)
      })
    ).subscribe({
      next: (profile) => this.profile = profile,
      error: () => queueMicrotask(() => {
        this.profileFetchError.set(true)
        this.toast.trigger(`Si è verificato un errore nel caricamento delle informazioni dell'account.`)
      })
    })
  }

  ngOnDestroy(): void {
    this.fetchSub?.unsubscribe()
  }

}
