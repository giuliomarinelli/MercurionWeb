import { DatePipe, NgClass, UpperCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  model,
  output,
  signal
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SelectionControlComponent } from '../../common/selection-control/selection-control.component';
import { CollectionCardViewModel } from './collection-card.models';

@Component({
  selector: 'm-collection-card',
  imports: [NgClass, DatePipe, UpperCasePipe, ReactiveFormsModule, RouterLink, SelectionControlComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    @keyframes slide-out-card {
      from { max-height: fit-content; }
      to { max-height: 0; }
    }

    @keyframes fade-out-card {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    .disappear-card {
      overflow: hidden;
      animation: .45s ease-in both slide-out-card, .45s ease-out both fade-out-card;
    }
  `,
  template: `
    @if (_collection()) {
      <article
        class="relative isolate group focus-within:outline-none transition-transform duration-200 hover:-translate-y-0.5 max-h-fit"
        [class.cursor-pointer]="!_isReadonly() && !_selectable()"
        [class.cursor-default]="_isReadonly() || _selectable()"
        [attr.aria-live]="!_isReadonly() ? 'polite' : 'off'"
        [class.disappear-card]="_triggerDisappear()"
        (click)="openCard($event)"
      >
        <div class="flex items-start gap-3 w-full" [class.grid]="selectable()" [class.grid-cols-[28px_1fr]]="selectable()">
          @if (_selectable()) {
            <m-selection-control
              class="pt-5"
              [label]="'Seleziona collezione ' + _collection()?.name"
              [checked]="selected()"
              [disabled]="selectionDisabled()"
              [ariaLabel]="'Seleziona collezione ' + _collection()?.name"
              (changed)="setSelected($event)"
            />
          }

          <div class="min-w-0 w-full">
            <div
              class="
                relative z-10
                grid grid-cols-1 md:grid-cols-12 items-center gap-5 sm:gap-4
                border p-4 md:p-5
                bg-slate-100 dark:bg-slate-800/50 backdrop-blur-sm
                border-slate-200/70 dark:border-slate-700/60
                transition-all duration-200
                hover:shadow-md
                hover:border-indigo-300/50 dark:hover:border-indigo-400/30
                focus-within:ring-2 focus-within:ring-indigo-500/70
              "
              [ngClass]="{ 'bg-slate-100/45 dark:bg-slate-800/40': _i() % 2 !== 0 }"
            >
              <div class="md:col-span-8 flex items-start gap-3 min-w-0">
                <div
                  class="hidden sm:flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-semibold"
                  aria-hidden="true"
                >
                  {{ (_collection()?.name || '?').slice(0,1) | uppercase }}
                </div>

                <div class="min-w-0">
                  @if (!_isReadonly() && !_selectable()) {
                    <a
                      class="text-base md:text-lg font-semibold text-slate-800 dark:text-slate-100 truncate hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      [routerLink]="pathToCollection()"
                    >
                      {{ _collection()?.name }}
                    </a>
                  } @else {
                    <div
                      class="text-base md:text-lg font-semibold text-slate-800 dark:text-slate-100 truncate"
                      [title]="_collection()?.name"
                    >
                      {{ _collection()?.name }}
                    </div>
                  }
                </div>
              </div>

              <div class="md:col-span-4 flex md:justify-end items-center gap-3 md:gap-4 text-sm text-slate-700 dark:text-slate-200">
                <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-700/40">
                  <strong class="mr-1">{{ _collection()?.itemsCount }}</strong>
                  {{ _collection()?.itemsCount === 1 ? 'molecola' : 'molecole' }}
                </span>
                @if (!_isReadonly() && !_selectable()) {
                  <a
                    class="hidden md:block size-4 opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    [routerLink]="pathToCollection()"
                    aria-label="Apri collezione {{ _collection()?.name }}"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M10.22 3.22a.75.75 0 0 1 1.06 0l6 6a.75.75 0 0 1-1.06 1.06L11 5.56V17a.75.75 0 0 1-1.5 0V5.56l-5.22 4.72A.75.75 0 0 1 3.22 9.22l6-6z" clip-rule="evenodd" />
                    </svg>
                  </a>
                }
              </div>

              <div class="md:col-span-12 mt-1 md:mt-0 flex flex-col sm:flex-row gap-6 sm:gap-3 items-start sm:items-center text-xs text-slate-700 dark:text-slate-200 justify-between w-full">
                <div class="flex flex-wrap items-start sm:items-center gap-4 sm:gap-3">
                  <span class="inline-flex items-center">
                    <svg class="size-3.5 mr-1.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v1H3V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1z"/><path d="M3 8h14v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/></svg>
                    {{ _collection()?.createdAt | date :'dd/MM/yyyy HH:mm:ss' }}
                  </span>
                  <span class="size-1 rounded-full bg-slate-400 dark:bg-slate-500 hidden md:inline"></span>
                  <span class="inline-flex items-center">
                    <svg class="size-3.5 mr-1.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 2a8 8 0 1 0 8 8 8.01 8.01 0 0 0-8-8Zm.75 4.75a.75.75 0 0 0-1.5 0v3.69l2.72 2.72a.75.75 0 0 0 1.06-1.06l-2.28-2.28V6.75Z"/></svg>
                    {{ _collection()?.updatedAt | date :'dd/MM/yyyy HH:mm:ss' }}
                  </span>
                </div>

                @if (!_isReadonly() && !_hideActionButtons()) {
                  <div class="flex flex-wrap items-center gap-2 sm:gap-3 justify-start sm:justify-end w-full sm:w-auto">
                    <button type="button" class="relative z-20 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-150" title="Duplica collezione" (click)="onActionClick($event); doDuplicateCollection()" aria-label="Duplica collezione {{ _collection()?.name }}">
                      <svg class="size-4 text-slate-600 dark:text-slate-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M4 4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1h-1V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h1v1H6a2 2 0 0 1-2-2V4z" />
                        <path d="M8 6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V6z" />
                      </svg>
                    </button>
                    <button type="button" class="relative z-20 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-150" title="Elimina collezione" (click)="onActionClick($event); doDeleteCollection()" aria-label="Elimina collezione {{ _collection()?.name }}">
                      <svg class="size-4 text-light-error dark:text-dark-error" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M6 8a1 1 0 0 1 1 1v7h6V9a1 1 0 1 1 2 0v7a2 2 0 0 1-2-2H7a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1zM4 5a1 1 0 0 1 1-1h2V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v1H4V5z" clip-rule="evenodd" />
                      </svg>
                    </button>
                    <button type="button" class="flex items-center gap-2 relative z-20 px-3 py-1 rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-150" title="Aggiungi molecole" (click)="onActionClick($event); doAddMoleculesToCollection()" aria-label="Aggiungi molecole a {{ _collection()?.name }}">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto" aria-hidden="true">
                        <path d="M336 112L336 96L304 96L304 304L96 304L96 336L304 336L304 544L336 544L336 336L544 336L544 304L336 304L336 112z" />
                      </svg>
                      <span>Aggiungi molecole</span>
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </article>
    }
  `
})
export class CollectionCardComponent {
  private readonly router = inject(Router);

  _collection = signal<CollectionCardViewModel | undefined>(undefined);
  _i = signal(0);
  pathToCollection = signal('');
  _isReadonly = signal(false);
  _triggerDisappear = signal(false);
  _hideActionButtons = signal(false);
  _selectable = signal(false);

  readonly collection = input.required<CollectionCardViewModel>();
  readonly i = input(0);
  readonly isReadonly = input(false);
  readonly triggerDisappear = input(false);
  readonly collapse = input(false);
  readonly hideActionButtons = input(false);
  readonly selectable = input(false);
  readonly selectionDisabled = input(false);
  readonly selected = model(false);

  readonly onDuplicate = output<string>();
  readonly onDelete = output<string>();
  readonly onAddMolecules = output<string>();

  private readonly syncInputs = effect(() => {
    const collection = this.collection();
    this._collection.set(collection);
    this.pathToCollection.set(`/molecules/collections/detail/${collection.id}`);
    this._i.set(this.i());
    this._isReadonly.set(this.isReadonly());
    this._triggerDisappear.set(this.triggerDisappear());
    this._hideActionButtons.set(this.hideActionButtons());
    this._selectable.set(this.selectable());
  });

  setSelected(value: boolean): void {
    if (!this.selectionDisabled()) this.selected.set(value);
  }

  openCard(event: MouseEvent): void {
    if (this._isReadonly() || this._selectable()) return;
    if (event.target instanceof Element && event.target.closest('a, button, input, [role="button"]')) return;
    void this.router.navigateByUrl(this.pathToCollection());
  }

  onActionClick(evt: Event): void {
    evt.preventDefault();
    evt.stopPropagation();
  }

  doDuplicateCollection(): void {
    const collection = this._collection();
    if (collection) this.onDuplicate.emit(collection.id);
  }

  doDeleteCollection(): void {
    const collection = this._collection();
    if (collection) this.onDelete.emit(collection.id);
  }

  doAddMoleculesToCollection(): void {
    const collection = this._collection();
    if (collection) this.onAddMolecules.emit(collection.id);
  }
}
