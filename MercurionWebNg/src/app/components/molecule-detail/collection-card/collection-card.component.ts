import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { DatePipe, NgClass, UpperCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';

@Component({
  selector: 'm-collection-card',
  standalone: true,
  imports: [NgClass, DatePipe, UpperCasePipe],
  styles: `

    @keyframes slide-out-card {
      from {
        max-height: fit-content;
      }
      to {
        max-height: 0;
      }
    }

    @keyframes fade-out-card {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    .disappear-card {
      overflow: hidden;
      animation: .45s ease-in both slide-out-card, .45s ease-out both fade-out-card;
    }

  `,
  template: `

    @if (_collection()) {
      <article
        class="relative isolate group focus-visible:outline-none transition-transform duration-200 hover:-translate-y-0.5 max-h-fit"
        [class.cursor-pointer]="!_isReadonly()"
        [attr.aria-disabled]="_isReadonly() ? true : null"
        role="link"
        tabindex="0"
        (click)="goToCollection($event)"
        (keydown.enter)="goToCollection($event)"
        (keydown.space)="goToCollection($event)"
        [attr.aria-label]="'Apri collezione ' + _collection()!.name"
        [class.disappear-card]="_triggerDisappear()"
      >
        <!-- Wrapper che anima l'altezza -->
        <div class="clip-wrapper">
          <!-- Overflow visibile normalmente; hidden solo quando collassa -->
          <div class="clip-viewport">
            <div
              [class.disappear-card]="_triggerDisappear()"
              class="
                relative z-10
                grid grid-cols-1 md:grid-cols-12 items-center gap-3 md:gap-4
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
              <!-- Colonna sinistra -->
              <div class="md:col-span-8 flex items-start gap-3 min-w-0">
                <div
                  class="hidden sm:flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-semibold"
                  aria-hidden="true"
                >
                  {{ (_collection()!.name || '?').slice(0,1) | uppercase }}
                </div>

                <div class="min-w-0">
                  <div
                    class="text-base md:text-lg font-semibold text-slate-800 dark:text-slate-100 truncate"
                    [title]="_collection()!.name"
                  >
                    {{ _collection()!.name }}
                  </div>

                  <div class="mt-1 flex md:hidden items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span class="inline-flex items-center">
                      <span class="size-1.5 rounded-full bg-slate-300 dark:bg-slate-500 mr-2"></span>
                      Creato: {{ _collection()!.createdAt | date :'dd/MM/yyyy HH:mm:ss' }}
                    </span>
                    <span class="text-slate-300 dark:text-slate-600">&middot;</span>
                    <span>Agg.: {{ _collection()!.updatedAt | date :'dd/MM/yyyy HH:mm:ss' }}</span>
                  </div>
                </div>
              </div>

              <!-- Colonna destra -->
              <div class="md:col-span-4 flex md:justify-end items-center gap-3 md:gap-4 text-sm text-slate-600 dark:text-slate-300">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-700/40 group-hover:scale-[1.02] transition-transform"
                >
                  <strong class="mr-1">{{ _collection()!.itemsCount }}</strong>
                  {{ _collection()!.itemsCount === 1 ? 'molecola' : 'molecole' }}
                </span>
                <svg
                  class="hidden md:block size-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
                >
                  <path fill-rule="evenodd" d="M10.22 3.22a.75.75 0 0 1 1.06 0l6 6a.75.75 0 0 1-1.06 1.06L11 5.56V17a.75.75 0 0 1-1.5 0V5.56l-5.22 4.72A.75.75 0 0 1 3.22 9.22l6-6z" clip-rule="evenodd" />
                </svg>
              </div>

              <!-- Footer -->
              <div class="md:col-span-12 mt-1 md:mt-0 flex items-center text-xs text-slate-500 dark:text-slate-400 justify-between">
                <div class="flex items-center gap-3">
                  <span class="inline-flex items-center">
                    <svg class="size-3.5 mr-1.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M6 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v1H3V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1z"/>
                      <path d="M3 8h14v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
                    </svg>
                    Creato: {{ _collection()!.createdAt | date :'dd/MM/yyyy HH:mm:ss' }}
                  </span>
                  <span class="size-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                  <span class="inline-flex items-center">
                    <svg class="size-3.5 mr-1.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M10 2a8 8 0 1 0 8 8 8.01 8.01 0 0 0-8-8Zm.75 4.75a.75.75 0 0 0-1.5 0v3.69l2.72 2.72a.75.75 0 0 0 1.06-1.06l-2.28-2.28V6.75Z"/>
                    </svg>
                    Aggiornato: {{ _collection()!.updatedAt | date :'dd/MM/yyyy HH:mm:ss' }}
                  </span>
                </div>

                @if (!_isReadonly() && !_hideActionButtons()) {
                  <div class="flex items-center gap-3">
                    <button
                      type="button"
                      class="relative z-20 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-150"
                      title="Duplica collezione"
                      (click)="onActionClick($event); doDuplicateCollection()"
                    >
                      <svg class="size-4 text-slate-600 dark:text-slate-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M4 4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1h-1V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h1v1H6a2 2 0 0 1-2-2V4z" />
                        <path d="M8 6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V6z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      class="relative z-20 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-150"
                      title="Elimina collezione"
                      (click)="onActionClick($event); doDeleteCollection()"
                    >
                      <svg class="size-4 text-light-error dark:text-dark-error" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M6 8a1 1 0 0 1 1 1v7h6V9a1 1 0 1 1 2 0v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1zM4 5a1 1 0 0 1 1-1h2V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v1H4V5z" clip-rule="evenodd" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      class="flex items-center gap-2 relative z-20 px-3 py-1 rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-150"
                      title="Aggiungi molecole"
                      (click)="onActionClick($event); doAddMoleculesToCollection()"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto" aria-hidden="true">
                        <path d="M336 112L336 96L304 96L304 304L96 304L96 336L304 336L304 544L336 544L336 336L544 336L544 304L336 304L336 112z"/>
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


  private readonly router = inject(Router)



  _collection = signal<MoleculeCollection | undefined>(undefined);
  _i = signal<number>(0);
  pathToCollection = signal<string>('');
  _isReadonly = signal<boolean>(false);
  _triggerDisappear = signal<boolean>(false)
  _collapse = signal<boolean>(false)
  _hideActionButtons = signal<boolean>(false)


  @Input({ required: true })
  set collection(collection: MoleculeCollection) {
    this._collection.set(collection);
    this.pathToCollection.set(`/molecules/collections/detail/${collection.id}`);
  }

  @Input() set i(i: number) {
    this._i.set(i)
  }

  @Input() set isReadonly(isReadonly: boolean) {
    this._isReadonly.set(isReadonly)
  }

  @Input()
  set triggerDisappear(triggerDisappear: boolean) {
    this._triggerDisappear.set(triggerDisappear)
  }

  @Input()
  set collapse(collapse: boolean) {
    this._collapse.set(collapse)
  }

  @Input()
  set hideActionButtons(hideActionButtons: boolean) {
    this._hideActionButtons.set(hideActionButtons)
  }

  @Output()
  onDuplicate = new EventEmitter<string>()

  @Output()
  onDelete = new EventEmitter<string>()

  @Output()
  onAddMolecules = new EventEmitter<string>()

  goToCollection(evt?: Event): void {
    if (this._isReadonly()) return;
    evt?.preventDefault();
    evt?.stopPropagation();
    const path = this.pathToCollection();
    if (path) this.router.navigateByUrl(path);
  }

  onActionClick(evt: Event): void {
    evt.preventDefault();
    evt.stopPropagation();
  }

  // Implementazioni reali a tua discrezione
  doDuplicateCollection(): void {
    this.onDuplicate.emit(this._collection()!.id)
  }

  doDeleteCollection(): void {
    this.onDelete.emit(this._collection()!.id)
  }

  doAddMoleculesToCollection(): void {
    this.onAddMolecules.emit(this._collection()!.id)
  }

}
