import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MoleculeViewerComponent } from '../../chem/molecule-viewer/molecule-viewer.component';
import { MoleculeSummaryAction, MoleculeSummaryViewModel } from './molecule-summary-card.view-model';

@Component({
  selector: 'm-molecule-summary-card',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, MoleculeViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  template: `
    <article
      class="relative grid items-center gap-3 rounded-2xl border p-4 md:p-5
        bg-slate-100 dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-700/60
        transition-all duration-200 hover:shadow-md focus-within:ring-2 focus-within:ring-indigo-500/70"
      [class.grid-cols-[3rem_1fr]]="viewModel().compact"
      [class.md:grid-cols-12]="!viewModel().compact"
      [attr.aria-label]="'Molecola ' + viewModel().name">
      <a
        class="absolute inset-0 rounded-2xl"
        [class.pointer-events-none]="viewModel().selectable"
        [routerLink]="detailUrl()"
        (click)="navigate.emit()"
        [attr.aria-label]="'Apri molecola ' + viewModel().name"></a>

      <div class="relative z-10 shrink-0 overflow-hidden rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white/40 dark:bg-slate-900/30"
        [class.size-12]="viewModel().compact"
        [class.size-24]="!viewModel().compact">
        <m-molecule-viewer class="block size-full" [structure]="viewModel().smiles" />
      </div>

      <div class="relative z-10 min-w-0" [class.md:col-span-8]="!viewModel().compact">
        <div class="flex items-center gap-2 truncate text-base md:text-lg font-semibold text-slate-800 dark:text-slate-100">
          <span class="truncate">{{ viewModel().name }}</span>
          @if (viewModel().badge) {
            <span class="shrink-0 rounded-full border border-indigo-200/70 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/30 dark:text-indigo-300">
              {{ viewModel().badge }}
            </span>
          }
        </div>
        <div class="truncate text-xs md:text-sm text-slate-700 dark:text-slate-200">{{ viewModel().synonym }}</div>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
          @if (viewModel().molecularWeight) { <span class="rounded-full border px-2 py-1">MW: {{ viewModel().molecularWeight | number:'1.0-1' }}</span> }
          @if (viewModel().phase) { <span class="rounded-full border border-amber-200/70 bg-amber-50 px-2 py-1 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">Phase {{ viewModel().phase }}</span> }
        </div>
        @if (!viewModel().compact && viewModel().source === 'saved' && viewModel().createdAt && viewModel().updatedAt) {
          <div class="mt-3 flex flex-wrap gap-3 text-xs text-slate-700 dark:text-slate-200">
            <span>Creata {{ viewModel().createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</span>
            <span>Aggiornata {{ viewModel().updatedAt | date:'dd/MM/yyyy HH:mm:ss' }}</span>
          </div>
        }
      </div>

      @if (viewModel().actions.length) {
        <div class="relative z-20 flex flex-wrap items-center justify-end gap-2 md:col-span-12">
          @for (action of viewModel().actions; track action.label) {
            @if (action.kind === 'link') {
              <a class="rounded-md px-2 py-1 text-xs hover:bg-slate-200 dark:hover:bg-slate-700"
                [routerLink]="action.href" [queryParams]="action.queryParams" [attr.aria-label]="action.label">{{ action.label }}</a>
            } @else {
              <button type="button" class="rounded-md px-2 py-1 text-xs hover:bg-slate-200 dark:hover:bg-slate-700"
                [attr.aria-label]="action.label" (click)="actionSelected.emit(action.action)">{{ action.label }}</button>
            }
          }
        </div>
      }
    </article>
  `
})
export class MoleculeSummaryCardComponent {
  readonly viewModel = input.required<MoleculeSummaryViewModel>();
  readonly actionSelected = output<'delete' | 'remove' | 'select'>();
  readonly navigate = output<void>();

  detailUrl(): string {
    return `/molecules/detail/${this.viewModel().id}`;
  }
}
