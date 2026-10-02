import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'
import { DecimalPipe } from '@angular/common'
import { RouterLink } from '@angular/router'

import type { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface'

@Component({
  selector: 'm-live-molecule-analogs',
  imports: [DecimalPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pt-2" [attr.aria-busy]="loading()">
      @if (loading()) {
        <div class="space-y-2" role="status" aria-label="Ricerca analoghi molecolari in corso">
          @for (index of [0, 1, 2]; track index) {
            <div class="h-12 rounded-md bg-slate-200/70 dark:bg-slate-700/60 animate-pulse"></div>
          }
        </div>
      } @else if (error()) {
        <p class="py-3 text-sm text-light-error dark:text-dark-error">
          Ricerca degli analoghi non disponibile.
        </p>
      } @else if (items().length) {
        <div class="divide-y divide-slate-200/80 dark:divide-slate-700/70">
          @for (molecule of items(); track molecule.id; let index = $index) {
            <a
              class="group grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 py-2.5"
              [routerLink]="['/molecules/detail', molecule.id]"
              [attr.aria-label]="'Apri analogo ' + moleculeName(molecule)"
            >
              <span class="text-xs font-semibold tabular-nums text-slate-400 dark:text-slate-500">
                {{ index + 1 }}
              </span>

              <div class="min-w-0">
                <span
                  class="block truncate text-sm font-semibold text-slate-800 transition-colors group-hover:text-light-accent-primary-hc dark:text-slate-100 dark:group-hover:text-dark-accent-primary"
                  [title]="moleculeName(molecule)"
                >
                  {{ moleculeName(molecule) }}
                </span>

                <span class="block truncate text-[0.68rem] text-slate-500 dark:text-slate-400">
                  @if (molecule.mwFreebase !== null && molecule.mwFreebase !== undefined) {
                    MW {{ molecule.mwFreebase | number:'1.0-1' }}
                  }
                  @if (molecule.maxPhase !== null && molecule.maxPhase !== undefined) {
                    · Fase {{ molecule.maxPhase }}
                  }
                </span>
              </div>

              <span class="text-lg text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                ›
              </span>
            </a>
          }
        </div>
      } @else if (unavailable()) {
        <p class="py-3 text-sm leading-snug text-slate-500 dark:text-slate-400">
          Nessun analogo disponibile: la struttura corrente non è ancora rappresentata nel corpus di embedding.
        </p>
      } @else {
        <p class="py-3 text-sm text-slate-500 dark:text-slate-400">
          Nessun analogo trovato.
        </p>
      }
    </div>
  `
})
export class LiveMoleculeAnalogsComponent {
  readonly molecules = input<readonly MoleculeSearchResult[]>([])
  readonly loading = input(false)
  readonly error = input(false)
  readonly unavailable = input(false)
  readonly limit = input(3)

  protected readonly items = computed(() => this.molecules().slice(0, this.limit()))

  protected moleculeName(molecule: MoleculeSearchResult): string {
    return molecule.preferredNameIt?.trim() ||
      molecule.preferredName?.trim() ||
      `Lead ${molecule.id}`
  }
}
