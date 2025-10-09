import { Component, Input, signal } from '@angular/core';
import { MoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { RouterLink } from '@angular/router';
import { DatePipe, NgClass, UpperCasePipe } from '@angular/common';

@Component({
  selector: 'app-collection-card',
  imports: [RouterLink, NgClass, DatePipe, UpperCasePipe],
  template: `
    @if (_collection()) {
      <a
        [routerLink]="pathToCollection()"
        class="group block focus-visible:outline-none"
        aria-label="Apri collezione {{ _collection()!.name }}"
      >
        <div
          class="
            grid grid-cols-1 md:grid-cols-12 items-center gap-3 md:gap-4
            border p-4 md:p-5
            bg-white/70 dark:bg-slate-800/50 backdrop-blur-sm
            border-slate-200/70 dark:border-slate-700/60
            transition-all duration-200
            hover:shadow-md hover:-translate-y-0.5
            hover:border-indigo-300/50 dark:hover:border-indigo-400/30
            focus-within:ring-2 focus-within:ring-indigo-500/70
          "
          [ngClass]="{
            'bg-slate-50/60 dark:bg-slate-800/40': _i() % 2 !== 0
          }"
        >
          <!-- Colonna sinistra: 8/12 -->
          <div class="md:col-span-8 flex items-start gap-3 min-w-0">
            <!-- Avatar/emoji decorativo opzionale -->
            <div
              class="
                hidden sm:flex size-9 shrink-0 items-center justify-center
                rounded-xl border border-slate-200/70 dark:border-slate-700/60
                bg-indigo-50 dark:bg-indigo-900/30
                text-indigo-700 dark:text-indigo-300 text-sm font-semibold
              "
              aria-hidden="true"
            >
              {{ (_collection()!.name || '·').slice(0,1) | uppercase }}
            </div>

            <div class="min-w-0">
              <div
                class="
                  text-base md:text-lg font-semibold
                  text-slate-800 dark:text-slate-100
                  truncate
                "
                title="{{ _collection()!.name }}"
              >
                {{ _collection()!.name }}
              </div>

              <!-- Meta (mobile) sotto al titolo -->
              <div class="mt-1 flex md:hidden items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span class="inline-flex items-center">
                  <span class="size-1.5 rounded-full bg-slate-300 dark:bg-slate-500 mr-2"></span>
                  Creato: {{ _collection()!.createdAt | date:'mediumDate' }}
                </span>
                <span class="text-slate-300 dark:text-slate-600">•</span>
                <span>Agg.: {{ _collection()!.updatedAt | date:'mediumDate' }}</span>
              </div>
            </div>
          </div>

          <!-- Colonna destra: 4/12 -->
          <div
            class="
              md:col-span-4 flex md:justify-end items-center gap-3 md:gap-4
              text-sm text-slate-600 dark:text-slate-300
            "
          >
            <span
              class="
                inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium
                bg-indigo-50 text-indigo-700
                dark:bg-indigo-900/30 dark:text-indigo-300
                border border-indigo-200/70 dark:border-indigo-700/40
                group-hover:scale-[1.02] transition-transform
              "
            >
              <strong class="mr-1">{{ _collection()!.itemsCount }}</strong> molecole
            </span>

            <!-- Freccia decorativa al passaggio -->
            <svg
              class="hidden md:block size-4 opacity-0 group-hover:opacity-100 transition-opacity"
              viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
            >
              <path fill-rule="evenodd"
                d="M10.22 3.22a.75.75 0 0 1 1.06 0l6 6a.75.75 0 0 1-1.06 1.06L11 5.56V17a.75.75 0 0 1-1.5 0V5.56l-5.22 4.72A.75.75 0 0 1 3.22 9.22l6-6z"
                clip-rule="evenodd" />
            </svg>
          </div>

          <!-- Footer meta: full width -->
          <div class="md:col-span-12 mt-1 md:mt-0 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span class="inline-flex items-center">
              <svg class="size-3.5 mr-1.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M6 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v1H3V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1z"/>
                <path d="M3 8h14v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
              </svg>
              Creato: {{ _collection()!.createdAt | date:'mediumDate' }}
            </span>
            <span class="size-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
            <span class="inline-flex items-center">
              <svg class="size-3.5 mr-1.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10 2a8 8 0 1 0 8 8 8.01 8.01 0 0 0-8-8Zm.75 4.75a.75.75 0 0 0-1.5 0v3.69l2.72 2.72a.75.75 0 0 0 1.06-1.06l-2.28-2.28V6.75Z"/>
              </svg>
              Aggiornato: {{ _collection()!.updatedAt | date:'mediumDate' }}
            </span>
          </div>
        </div>
      </a>
    }
  `
})
export class CollectionCardComponent {
  _collection = signal<MoleculeCollection | undefined>(undefined);
  _i = signal<number>(0);
  pathToCollection = signal<string>('');

  @Input({ required: true })
  set collection(collection: MoleculeCollection) {
    this._collection.set(collection);
    this.pathToCollection.set(`/molecules/collections/detail/${collection.id}`);
  }

  @Input()
  set i(i: number) {
    this._i.set(i);
  }
}
