import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { GenderPipe } from '../../pipes/gender.pipe'
import { SettingsAccountFacade } from './settings-account.facade'

@Component({
  selector: 'm-settings-overview-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GenderPipe],
  template: `
    @if (account.profile(); as profile) {
      <div class="space-y-6 py-6 px-4">
        <div>
          <h3 class="font-bold text-lg mb-1">Riepilogo account</h3>
          <p class="text-sm text-slate-600 dark:text-slate-300">Panoramica del profilo e dello stato dell’account.</p>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="rounded-md border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/70 px-4 py-3">
            <div class="text-xs uppercase">Profilo</div>
            <div class="text-base font-semibold">{{ profile.firstName }} {{ profile.lastName }}</div>
            <div class="text-sm mt-2 space-y-1">
              <div class="flex justify-between gap-2"><span>Ruolo</span><strong>{{ profile.job ?? 'Non specificato' }}</strong></div>
              <div class="flex justify-between gap-2"><span>Genere</span><strong>{{ profile.gender | gender }}</strong></div>
              <div class="flex justify-between gap-2"><span>E-mail</span><strong class="font-mono text-xs">{{ profile.obscuredEmail }}</strong></div>
              <div class="flex justify-between gap-2"><span>Provider</span><strong class="font-mono text-xs">{{ account.authProvider() }}</strong></div>
            </div>
          </div>
          <div class="rounded-md border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/70 px-4 py-3">
            <div class="text-xs uppercase">Attività su Mercurion</div>
            <div class="grid grid-cols-3 gap-3 mt-3 text-center">
              <div><div class="text-2xl font-semibold">{{ profile.personalMoleculeCount }}</div><small>Molecole personali</small></div>
              <div><div class="text-2xl font-semibold">{{ profile.chemblMoleculeCount }}</div><small>Molecole ChEMBL</small></div>
              <div><div class="text-2xl font-semibold">{{ profile.collectionCount }}</div><small>Collezioni</small></div>
            </div>
          </div>
        </div>
        @if (account.version(); as version) {
          <div><h4 class="font-bold text-base">Informazioni sulla versione</h4><p>Mercurion {{ version.version }}</p><p class="text-xs">mercurion@{{ version.revision }}</p></div>
        }
      </div>
    }
  `,
})
export class SettingsOverviewPanelComponent {
  readonly account = inject(SettingsAccountFacade)
}
