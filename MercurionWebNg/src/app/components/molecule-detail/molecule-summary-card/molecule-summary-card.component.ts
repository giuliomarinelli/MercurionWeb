import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
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
      class="relative grid grid-cols-1 items-center gap-3 overflow-hidden rounded-2xl border p-4 md:p-5
        bg-slate-100 dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-700/60
        transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-300/50 hover:shadow-md
        dark:hover:border-indigo-400/30 focus-within:ring-2 focus-within:ring-indigo-500/70"
      [class.grid-cols-[3rem_1fr]]="viewModel().compact"
      [class.md:grid-cols-12]="!viewModel().compact"
      [class.fade-out]="disappearing()"
      [class.collapse]="collapsed()"
      [attr.aria-label]="'Molecola ' + viewModel().name">
      <a
        class="absolute inset-0 z-10 rounded-2xl"
        [class.pointer-events-none]="viewModel().selectable"
        [class.hidden]="disappearing()"
        [routerLink]="detailUrl()"
        [queryParams]="detailQueryParams()"
        (click)="navigate.emit()"
        [attr.aria-label]="'Apri molecola ' + viewModel().name"></a>

      <div class="pointer-events-none relative min-w-0"
        [class.order-2]="viewModel().compact"
        [class.md:col-span-8]="!viewModel().compact">
        <div class="flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100 md:text-lg">
          <span class="truncate" [title]="viewModel().name">{{ viewModel().name }}</span>
          @if (viewModel().badge) {
            <span class="shrink-0 rounded-full border border-indigo-200/70 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/30 dark:text-indigo-300">
              {{ viewModel().badge }}
            </span>
          }
        </div>
        <div class="truncate text-xs text-slate-700 dark:text-slate-200 md:text-sm" [title]="viewModel().synonym">{{ viewModel().synonym }}</div>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
          @if (viewModel().molecularWeight) { <span class="rounded-full border px-2 py-1">MW: {{ viewModel().molecularWeight | number:'1.0-1' }}</span> }
          @if (viewModel().phase) { <span class="rounded-full border border-amber-200/70 bg-amber-50 px-2 py-1 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">Phase {{ viewModel().phase }}</span> }
        </div>
      </div>

      <div class="pointer-events-none relative shrink-0 justify-self-end overflow-hidden rounded-xl border border-slate-200/70 bg-white/40 dark:border-slate-700/60 dark:bg-slate-900/30"
        [class.order-1]="viewModel().compact"
        [class.size-12]="viewModel().compact"
        [class.size-24]="!viewModel().compact"
        [class.md:col-span-4]="!viewModel().compact"
        [class.md:size-28]="!viewModel().compact">
        @if (!viewerReady()) {
          <div class="absolute inset-0 z-20 animate-pulse bg-slate-200/80 dark:bg-slate-700/70"></div>
        }
        <m-molecule-viewer class="absolute inset-0 size-full" [structure]="viewModel().smiles" (rendered)="viewerReady.set(true)" />
      </div>

      @if (!viewModel().compact && viewModel().source === 'saved') {
        <div class="pointer-events-none relative z-20 mt-1 flex flex-col items-start justify-between gap-3 text-xs text-slate-700 dark:text-slate-200 sm:flex-row sm:items-center md:col-span-12">
          @if (viewModel().createdAt && viewModel().updatedAt) {
            <div class="flex flex-wrap items-center gap-3">
              <span>Creata {{ viewModel().createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</span>
              <span>Aggiornata {{ viewModel().updatedAt | date:'dd/MM/yyyy HH:mm:ss' }}</span>
            </div>
          }
          <div class="pointer-events-auto flex flex-wrap items-center justify-end gap-3">
          @for (action of viewModel().actions; track action.label) {
            @if (action.kind === 'link') {
              <a class="rounded-md p-1 transition-colors duration-150 hover:bg-slate-200 dark:hover:bg-slate-700"
                [routerLink]="action.href" [queryParams]="action.queryParams" [title]="action.label" [attr.aria-label]="action.label">
                @if (action.icon === 'duplicate') {
                  <svg class="size-4 text-slate-700 dark:text-slate-200" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M4 4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1h-1V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h1v1H6a2 2 0 0 1-2-2V4z" />
                    <path d="M8 6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V6z" />
                  </svg>
                } @else { <span>{{ action.label }}</span> }
              </a>
            } @else {
              <button type="button"
                class="rounded-md p-1 transition-colors duration-150 hover:bg-slate-200 dark:hover:bg-slate-700"
                [class.flex]="action.icon === 'remove'" [class.items-center]="action.icon === 'remove'" [class.gap-2]="action.icon === 'remove'"
                [class.border]="action.icon === 'remove'" [class.px-3]="action.icon === 'remove'"
                [title]="action.label" [attr.aria-label]="action.label" (click)="actionSelected.emit(action.action)">
                @if (action.icon === 'delete') {
                  <svg class="size-4 text-light-error dark:text-dark-error-hc" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M6 8a1 1 0 0 1 1 1v7h6V9a1 1 0 1 1 2 0v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1zM4 5a1 1 0 0 1 1-1h2V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v1H4V5z" clip-rule="evenodd" />
                  </svg>
                } @else if (action.icon === 'remove') {
                  <svg class="size-4 fill-current" viewBox="0 0 640 640" aria-hidden="true"><path d="M96 304L544 304L544 336L96 336L96 304z" /></svg>
                  <span>{{ action.label }}</span>
                } @else { <span>{{ action.label }}</span> }
              </button>
            }
          }
          </div>
        </div>
      } @else if (viewModel().actions.length) {
        <div class="relative z-20 order-3 flex flex-wrap items-center justify-end gap-2">
          @for (action of viewModel().actions; track action.label) {
            @if (action.kind === 'button') {
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
  readonly detailQueryParams = input<Record<string, string | null>>({});
  readonly disappearing = input(false);
  readonly collapsed = input(false);
  readonly actionSelected = output<'delete' | 'remove' | 'select'>();
  readonly navigate = output<void>();
  readonly viewerReady = signal(false);

  detailUrl(): string {
    return `/molecules/detail/${this.viewModel().id}`;
  }
}
