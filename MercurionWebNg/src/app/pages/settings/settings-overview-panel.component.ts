import { Helpers } from '../../helpers'
import { SettingsSecurityFacade } from './settings-security.facade'
import { ChangeDetectionStrategy, Component, OnInit, inject, output } from '@angular/core'
import { GenderPipe } from '../../pipes/gender.pipe'
import { SettingsAccountFacade } from './settings-account.facade'

@Component({
  selector: 'm-settings-overview-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GenderPipe],
  template: `
    @if (account.profile(); as profile) {
      <div class="py-6 px-4">
<div class="space-y-6">

  <!-- Titolo -->
  <div>
    <h3 class="font-bold text-lg mb-1">
      Riepilogo account
    </h3>
    <p class="text-sm text-slate-600 dark:text-slate-300">
      Qui trovi una panoramica veloce del tuo profilo e dello stato dell'account.
    </p>
  </div>

  <!-- RIGA 1: Profilo + Sicurezza -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

    <!-- Card profilo -->
    <div
      class="rounded-md border border-slate-300 dark:border-slate-600
             bg-slate-50 dark:bg-slate-800/70 px-4 py-3 flex flex-col gap-2"
    >
      <div class="flex items-center justify-between gap-3 mb-1">
        <div>
          <div class="text-xs uppercase text-slate-700 dark:text-slate-200">
            Profilo
          </div>
          <div class="text-base font-semibold text-slate-800 dark:text-slate-100">
            {{ profile.firstName }} {{ profile.lastName }}
          </div>
        </div>

        <!-- iniziali "fittizie" da avatarId o fallback -->
        <div
          class="h-10 w-10 rounded-full flex items-center justify-center
                 bg-slate-200 dark:bg-slate-700 text-sm font-bold
                 text-slate-700 dark:text-slate-100"
        >
          {{ profile.firstName[0] }}{{ profile.lastName[0] }}
        </div>
      </div>

      <div class="text-sm space-y-1">
        <div class="flex justify-between gap-2">
          <span class="text-slate-700 dark:text-slate-200">Ruolo</span>
          <span class="font-medium text-slate-800 dark:text-slate-100">
            {{ profile.job ?? 'Non specificato' }}
          </span>
        </div>
        <div class="flex justify-between gap-2">
          <span class="text-slate-700 dark:text-slate-200">Genere</span>
          <span class="font-medium text-slate-800 dark:text-slate-100">
            {{ profile.gender | gender}}
          </span>
        </div>
        <div class="flex justify-between gap-2">
          <span class="text-slate-700 dark:text-slate-200">@if (profile.accountIdKind === 'email') { E-mail } @else { ORCID }</span>
          <span class="font-mono text-xs text-slate-700 dark:text-slate-200">
            {{ profile.obscuredAccountId }}
          </span>
        </div>
        <div class="flex justify-between gap-2">
          <span class="text-slate-700 dark:text-slate-200">Provider di autenticazione</span>
          <span class="font-mono text-xs text-slate-700 dark:text-slate-200">
            {{ account.authProvider() }}
          </span>
        </div>
        <div class="flex justify-between gap-2">
          <span class="text-slate-700 dark:text-slate-200">Provider di autorizzazione</span>
          <span class="font-mono text-xs text-slate-700 dark:text-slate-200">
            Mercurion
          </span>
        </div>
          @if (!account.isSso()) {
            <div class="flex justify-between gap-2">
              <span class="text-slate-700 dark:text-slate-200">Telefono</span>
              <span class="font-mono text-xs text-slate-700 dark:text-slate-200">
                {{ profile.obscuredPhone ?? '—' }}
              </span>
            </div>
          }
      </div>
    </div>

    <!-- Card sicurezza -->
    <div
      class="rounded-md border border-slate-300 dark:border-slate-600
             bg-slate-50 dark:bg-slate-800/70 px-4 py-3 flex flex-col gap-3"
    >
      <div class="flex items-center justify-between mb-1">
        <div>
          <div class="text-xs uppercase text-slate-700 dark:text-slate-200">
            Sicurezza
          </div>
          <div class="text-base font-semibold text-slate-800 dark:text-slate-100">
            Stato dell'account
          </div>
        </div>
      </div>

      <div class="space-y-2 text-sm">
        <div class="flex items-center justify-between gap-2">
          <span class="text-slate-700 dark:text-slate-200">
            Autenticazione a più fattori
          </span>
          <span
            class="px-2 py-[2px] rounded text-xs font-semibold cursor-default"
            [class.bg-emerald-200]="security.enabledMfa()"
            [class.text-emerald-800]="security.enabledMfa()"
            [class.dark:bg-amber-200]="!security.enabledMfa() || account.isSso()"
            [class.dark:text-amber-800]="!security.enabledMfa() || account.isSso()"
            [class.bg-amber-800]="!security.enabledMfa() || account.isSso()"
            [class.text-amber-200]="!security.enabledMfa() || account.isSso()"
          >
            @if (account.isSso()) {
              In carico al provider
            } @else {
              {{ security.enabledMfa() ? 'Attiva' : 'Non attiva' }}
            }
          </span>
        </div>

        <div class="flex items-center justify-between gap-2">
          <span class="text-slate-700 dark:text-slate-200">
            Sessioni attive
          </span>
          <span class="font-medium text-slate-800 dark:text-slate-100">
            {{ security.sessions().length || 0 }}
          </span>
        </div>
        @if (security.sessions().length) {
          <div class="flex items-center justify-between gap-2">
            <span class="text-slate-700 dark:text-slate-200">
              Sessione corrente
            </span>
            <span class="text-xs text-right text-slate-700 dark:text-slate-200">
              {{
                security.currentSession()?.browser ?? '—'
              }}
              ·
              {{
                security.currentSession()?.location ?? '—'
              }}
            </span>
          </div>
        }
      </div>

      <div class="flex justify-end pt-2">
        <button
          type="button"
          class="
            text-xs underline text-slate-600 dark:text-slate-300
            hover:text-slate-800 dark:hover:text-slate-100
            transition-colors duration-150
          "
          (click)="securitySelected.emit()"
        >
          Vai alle impostazioni di sicurezza
        </button>
      </div>
    </div>

  </div>

  <!-- RIGA 2: Statistiche Mercurion -->
  <div>
    <h4 class="font-bold text-base mb-3">
      Attività su Mercurion
    </h4>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">

      <div
        class="rounded-md border border-slate-300 dark:border-slate-600
               bg-slate-50 dark:bg-slate-800/70 px-4 py-3"
      >
        <div class="text-xs uppercase text-slate-700 dark:text-slate-200 mb-1">
          Molecole personali
        </div>
        <div class="text-2xl font-semibold text-slate-800 dark:text-slate-100">
          {{ profile.personalMoleculeCount }}
        </div>
      </div>

      <div
        class="rounded-md border border-slate-300 dark:border-slate-600
               bg-slate-50 dark:bg-slate-800/70 px-4 py-3"
      >
        <div class="text-xs uppercase text-slate-700 dark:text-slate-200 mb-1">
          Molecole da ChEMBL
        </div>
        <div class="text-2xl font-semibold text-slate-800 dark:text-slate-100">
          {{ profile.chemblMoleculeCount }}
        </div>
      </div>

      <div
        class="rounded-md border border-slate-300 dark:border-slate-600
               bg-slate-50 dark:bg-slate-800/70 px-4 py-3"
      >
        <div class="text-xs uppercase text-slate-700 dark:text-slate-200 mb-1">
          Collezioni
        </div>
        <div class="text-2xl font-semibold text-slate-800 dark:text-slate-100">
          {{ profile.collectionCount }}
        </div>
      </div>

    </div>
  </div>
  <div>
    <h4 class="font-bold text-base mt-3 mb-3">
      Informazioni sulla versione
    </h4>
    <p>Mercurion {{account.version()?.version}}</p>
    <p class="text-xs">mercurion@{{breakHex(account.version()?.revision)}}</p>

  </div>

</div>
      </div>
    }
  `,
})
export class SettingsOverviewPanelComponent implements OnInit {
  readonly account = inject(SettingsAccountFacade)
  readonly security = inject(SettingsSecurityFacade)
  readonly securitySelected = output<void>()
  ngOnInit(): void {
    this.security.load()
  }
  breakHex(revision?: string): string {
    return revision ? Helpers.breakHex(revision, false) : ''
  }
}
