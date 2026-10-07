import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MoleculeViewerComponent } from '../../chem/molecule-viewer/molecule-viewer.component';
import { MoleculeSummaryAction, MoleculeSummaryViewModel } from './molecule-summary-card.view-model';

@Component({
  selector: 'm-molecule-summary-card',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, MoleculeViewerComponent],
  styleUrl: './molecule-summary-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  template: `
    <article
      class="m-summary-card relative grid items-center gap-3 overflow-hidden rounded-2xl border p-4"
      [class.m-summary-card--compact]="viewModel().compact"
      [class.fade-out]="disappearing()"
      [class.collapse]="collapsed()"
      [attr.aria-label]="'Molecola ' + viewModel().name">
      @if (cardSelectable()) {
        <button type="button" class="absolute inset-0 z-10 w-full h-full rounded-2xl cursor-pointer"
          [attr.aria-label]="'Seleziona molecola ' + viewModel().name"
          (click)="actionSelected.emit('select')"></button>
      } @else if (!viewModel().selectable) {
      <a
        class="absolute inset-0 z-10 rounded-2xl"
        [class.hidden]="disappearing()"
        [routerLink]="detailUrl()"
        [queryParams]="detailQueryParams()"
        (click)="navigate.emit()"
        [attr.aria-label]="'Apri molecola ' + viewModel().name"></a>
      }

      <div class="pointer-events-none m-summary-card__identity relative min-w-0"
        [class.order-2]="viewModel().compact">
        <div class="m-summary-card__heading flex flex-wrap items-start gap-2 text-base font-semibold">
          <span class="m-summary-card__name min-w-0" [title]="viewModel().name">{{ viewModel().name }}</span>
          @if (viewModel().badge) {
            <span class="m-summary-card__badge shrink-0 rounded-full border px-2 py-0.5 text-xs">
              {{ viewModel().badge }}
            </span>
          }
        </div>
        <div class="m-summary-card__synonym truncate text-xs" [title]="viewModel().synonym">{{ viewModel().synonym }}</div>
        <div class="m-summary-card__metrics mt-2 flex flex-wrap items-center gap-2 text-xs">
          @if (viewModel().molecularWeight !== undefined && viewModel().molecularWeight !== null) { <span class="rounded-full border px-2 py-1">MW: {{ viewModel().molecularWeight | number:'1.0-1' }}</span> }
          @if (viewModel().phase !== undefined && viewModel().phase !== null && viewModel().phase! >= 0) { <span class="rounded-full border px-2 py-1">Fase {{ viewModel().phase }}</span> }
        </div>
        @if (viewModel().selectable && viewModel().source !== 'saved') {
          <p class="mt-2 text-xs text-slate-600 dark:text-slate-300">
            @if (cardSelectable()) {
              <span class="sm:hidden">Tocca per selezionare</span>
              <span class="hidden sm:inline">Clicca per selezionare</span>
            } @else { <span>Già selezionata</span> }
          </p>
        }
      </div>

      <div class="m-summary-card__viewer pointer-events-none relative shrink-0 overflow-hidden rounded-xl border"
        [class.order-1]="viewModel().compact">
        @if (!viewerReady()) {
          <div class="absolute inset-0 z-20 animate-pulse m-summary-card__skeleton"></div>
        }
        <m-molecule-viewer class="absolute inset-0 size-full" [structure]="viewModel().smiles" (rendered)="viewerReady.set(true)" />
      </div>

      @if (!viewModel().compact && viewModel().source === 'saved') {
        <div class="pointer-events-none relative z-20 m-summary-card__footer mt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
          @if (viewModel().createdAt) {
            <span class="inline-flex items-center" [title]="'Creata il ' + (viewModel().createdAt | date :'dd/MM/yyyy HH:mm:ss')">
              <svg class="size-3.5 mr-1.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v1H3V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1z"/><path d="M3 8h14v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/></svg>
              <span>{{ viewModel().createdAt | date :'dd/MM/yyyy' }}</span>
            </span>
          }
          <div class="m-summary-card__actions pointer-events-auto flex flex-wrap items-center justify-start gap-3 sm:justify-end">
          @for (action of visibleActions(); track action.label) {
            @if (action.kind === 'link') {
              <a class="m-summary-card__action rounded-md"
                [routerLink]="action.href" [queryParams]="action.queryParams" [title]="action.label" [attr.aria-label]="action.label">
                @if (action.icon === 'duplicate') {
                  <svg class="size-4 text-slate-700 dark:text-slate-200" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M4 4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1h-1V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h1v1H6a2 2 0 0 1-2-2V4z" />
                    <path d="M8 6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V6z" />
                  </svg>
                } @else { <span>{{ action.label }}</span> }
              </a>
            } @else if (action.action !== 'select') {
              <button type="button"
                class="m-summary-card__action rounded-md text-xs"
                [class.m-summary-card__action--remove]="action.icon === 'remove'"
                [class.flex]="action.icon === 'remove'" [class.items-center]="action.icon === 'remove'" [class.gap-2]="action.icon === 'remove'"
                [class.border]="action.icon === 'remove'" [class.px-3]="action.icon === 'remove'"
                [title]="action.label" [attr.aria-label]="action.label" (click)="actionSelected.emit(action.action)">
                @if (action.icon === 'delete') {
                  <svg class="size-4 text-light-error dark:text-dark-error-hc" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M6 8a1 1 0 0 1 1 1v7h6V9a1 1 0 1 1 2 0v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1zM4 5a1 1 0 0 1 1-1h2V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v1H4V5z" clip-rule="evenodd" />
                  </svg>
                } @else if (action.icon === 'remove') {
                  <svg class="w-4 h-auto shrink-0 fill-current" viewBox="0 0 640 640" aria-hidden="true"><path d="M96 304L544 304L544 336L96 336L96 304z" /></svg>
                  <span>{{ action.label }}</span>
                } @else { <span>{{ action.label }}</span> }
              </button>
            }
          }
          </div>
        </div>
      } @else if (visibleActions().length) {
        <div class="relative z-20 order-3 flex flex-wrap items-center justify-end gap-2">
          @for (action of visibleActions(); track action.label) {
            @if (action.kind === 'button' && action.action !== 'select') {
              <button type="button" class="m-summary-card__action rounded-md text-xs"
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
  readonly cardSelectable = computed(() => this.viewModel().selectable &&
    this.viewModel().actions.some(action => action.kind === 'button' && action.action === 'select'));
  readonly visibleActions = computed(() => this.viewModel().actions.filter(action =>
    action.kind !== 'button' || action.action !== 'select'));

  detailUrl(): string {
    return `/molecules/detail/${this.viewModel().id}`;
  }
}
