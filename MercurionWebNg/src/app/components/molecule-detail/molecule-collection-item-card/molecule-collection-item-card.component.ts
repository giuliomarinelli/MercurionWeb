import {
  Component, Input, signal, effect, ElementRef, OnDestroy, NgZone, inject
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe, NgClass, DatePipe } from '@angular/common';
import { MoleculeViewerComponent } from '../../chem/molecule-viewer/molecule-viewer.component';
import { SearchContextService } from '../../../services/context/search-context.service';
import { ThemeManagerService } from '../../../services/context/theme-manager.service';
import { MoleculeCardItemModel } from './../../../Models/graphql/molecule-collection/molecule-collection.types';

@Component({
  selector: 'app-molecule-collection-item-card',
  standalone: true,
  imports: [DecimalPipe, DatePipe, RouterLink, MoleculeViewerComponent, NgClass],
  template: `
    @if (_molecule()) {
      <a
        [routerLink]="_pathToMolecule()"
        (click)="searchContext.close()"
        class="group block focus-visible:outline-none"
        aria-label="Apri molecola {{ _molecule()!.name }}"
      >
        <div
          class="
            grid grid-cols-1 md:grid-cols-12 items-center gap-3 md:gap-4
            rounded-2xl border p-4 md:p-5
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
          <!-- Colonna sinistra: 8/12 - testo -->
          <div class="md:col-span-8 min-w-0">
            <div
              class="text-base md:text-lg font-semibold text-slate-800 dark:text-slate-100 truncate"
              [innerHTML]="_molecule()!.name"
              title="{{ _molecule()!.name }}"
            ></div>

            <div
              class="mt-0.5 text-xs md:text-sm text-slate-500 dark:text-slate-400 truncate"
              [innerHTML]="_molecule()!.syn"
              title="{{ _molecule()!.syn }}"
            ></div>

            <!-- Meta (mobile) sotto al titolo -->
            <div class="mt-2 flex md:hidden items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span class="inline-flex items-center">
                <span class="size-1.5 rounded-full bg-slate-300 dark:bg-slate-500 mr-2"></span>
                Creato: {{ _molecule()!.createdAt | date:'mediumDate' }}
              </span>
              <span class="text-slate-300 dark:text-slate-600">•</span>
              <span>Agg.: {{ _molecule()!.updatedAt | date:'mediumDate' }}</span>
            </div>

            <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
              @if (_molecule()!.mwFreebase) {
                <span
                  class="inline-flex items-center rounded-full px-2 py-1
                         bg-slate-100 dark:bg-slate-700/60
                         text-slate-700 dark:text-slate-200 border
                         border-slate-200/70 dark:border-slate-600/60"
                >
                  MW:&nbsp;{{ _molecule()!.mwFreebase | number:'1.0-1' }}
                </span>
              }
              @if (_molecule()!.maxPhase) {
                <span
                  class="inline-flex items-center rounded-full px-2 py-1
                         bg-amber-50 text-amber-700 border border-amber-200/70
                         dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/40"
                >
                  Phase&nbsp;{{ _molecule()!.maxPhase }}
                </span>
              }
            </div>
          </div>

          <!-- Colonna destra: 4/12 - viewer -->
          <div class="md:col-span-4 flex md:justify-end items-center">
            <div class="relative size-24 md:size-28 rounded-xl overflow-hidden border
                        border-slate-200/70 dark:border-slate-700/60 bg-white/40 dark:bg-slate-900/30">
              @if (!viewerReady()) {
                <div class="absolute inset-0 z-10 animate-pulse
                            bg-slate-200/80 dark:bg-slate-700/70"></div>
              }

              <molecule-viewer
                class="absolute inset-0 w-full h-full"
                [structure]="_molecule()!.smiles"
                [disablePreview]="disablePreview()"
                (rendered)="viewerReady.set(true)">
              </molecule-viewer>
            </div>
          </div>

          <!-- Footer meta: full width -->
          <div class="md:col-span-12 mt-1 md:mt-0 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span class="inline-flex items-center">
              <svg class="size-3.5 mr-1.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M6 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v1H3V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1z"/>
                <path d="M3 8h14v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
              </svg>
              Creato: {{ _molecule()!.createdAt | date:'mediumDate' }}
            </span>
            <span class="size-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
            <span class="inline-flex items-center">
              <svg class="size-3.5 mr-1.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10 2a8 8 0 1 0 8 8 8.01 8.01 0 0 0-8-8Zm.75 4.75a.75.75 0 0 0-1.5 0v3.69l2.72 2.72a.75.75 0 0 0 1.06-1.06l-2.28-2.28V6.75Z"/>
              </svg>
              Aggiornato: {{ _molecule()!.updatedAt | date:'mediumDate' }}
            </span>
          </div>
        </div>
      </a>
    }
  `
})
export class MoleculeCollectionItemCardComponent implements OnDestroy {
  // ======================= DEPS =======================
  protected readonly searchContext = inject(SearchContextService);
  private readonly themeManager = inject(ThemeManagerService);
  private readonly zone = inject(NgZone);
  private readonly host = inject(ElementRef<HTMLElement>);
  // ====================================================

  _molecule = signal<MoleculeCardItemModel | undefined>(undefined);
  _pathToMolecule = signal<string>('');
  _i = signal<number>(0);
  isDarkMode = signal<boolean>(false);
  viewerReady = signal<boolean>(false);
  /** viewer OFF finché true */
  disablePreview = signal<boolean>(true);

  private seen = false;
  private io!: IntersectionObserver;

  constructor() {
    effect(() => this.isDarkMode.set(this.themeManager.theme() === 'dark'));

    this.zone.runOutsideAngular(() => {
      this.io = new IntersectionObserver(
        ([entry], observer) => {
          if (entry.isIntersecting && !this.seen) {
            this.seen = true;
            observer.unobserve(entry.target);
            this.zone.run(() => this.disablePreview.set(false));
          }
        },
        { rootMargin: '150px', threshold: 0.01 }
      );

      const isInViewport = (el: HTMLElement) =>
        el.getBoundingClientRect().top < window.innerHeight + 150;

      queueMicrotask(() => {
        if (this.disablePreview() && isInViewport(this.host.nativeElement)) {
          this.zone.run(() => this.disablePreview.set(false));
        }
      });

      this.io.observe(this.host.nativeElement);
    });
  }

  /* inputs ---------------------------------- */
  @Input({ required: true })
  set molecule(m: MoleculeCardItemModel) {
    this.seen = false;
    this.viewerReady.set(false);
    this.disablePreview.set(true);

    this._molecule.set(m);
    this._pathToMolecule.set(`/molecules/detail/${m.id}`);

    this.zone.runOutsideAngular(() => this.io.observe(this.host.nativeElement));
  }

  @Input({ required: true })
  set i(i: number) {
    this._i.set(i);
  }

  ngOnDestroy() {
    this.io?.disconnect();
  }
}
