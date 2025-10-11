import { MoleculeCardItemModel } from './../../../Models/graphql/molecule-collection/molecule-collection.types';
import {
  Component, Input, signal, effect, ElementRef, OnDestroy, NgZone,
  inject
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe, NgClass } from '@angular/common';
import { MoleculeViewerComponent } from '../../chem/molecule-viewer/molecule-viewer.component';
import { SearchContextService } from '../../../services/context/search-context.service';
import { ThemeManagerService } from '../../../services/context/theme-manager.service';
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface';


@Component({
  selector: 'app-molecule-collection-item-card',
  standalone: true,
  imports: [DecimalPipe, RouterLink, MoleculeViewerComponent, NgClass],
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
        </div>
      </a>
    }
  `
})
export class MoleculeCollectionItemCardComponent implements OnDestroy {

  // ======================= DEPS =======================
  protected readonly searchContext = inject(SearchContextService)
  private readonly themeManager = inject(ThemeManagerService)
  private readonly zone = inject(NgZone)
  private readonly host = inject(ElementRef)
  // ====================================================


  /* segnali / stato */
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
