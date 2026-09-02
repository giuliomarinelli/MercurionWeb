import {
  Component, Input, signal, effect,
  ElementRef, OnDestroy,
  NgZone,
  Output,
  EventEmitter,
  inject,
  computed
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MoleculeViewerComponent } from '../../chem/molecule-viewer/molecule-viewer.component';
import { SearchContextService } from '../../../services/context/search-context.service';
import { ThemeManagerService } from '../../../services/context/theme-manager.service';
import { MoleculeSearchResult } from
  '../../../Models/graphql/molecule-search/molecule-search-result.interface';
import { ChipItem } from '../../action-components/add-molecules-to-collection/add-molecules-to-collection.component';
import { AppContextService } from '../../../services/context/app-context.service';
import { DesignService } from '../../../services/design.service';

@Component({
  selector: 'm-search-result',
  host: { class: 'block w-full' },
  imports: [
    DecimalPipe,
    RouterLink,
    MoleculeViewerComponent
  ],
  template: `
    @if (!_search_excludeAlreadyAdded()) {
      <a [routerLink]="_pathToMolecule()" (click)="handleClick()"
         class="flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50
                dark:hover:bg-slate-800 cursor-pointer transition">

        <div class="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden relative">
          @if (!viewerReady()) {
            <div class="absolute inset-0 z-10 animate-pulse
                        bg-slate-200 dark:bg-slate-700"></div>
          }

          <m-molecule-viewer
            class="w-full h-full"
            [structure]="_molecule()?.smiles ?? ''"
            [disablePreview]="disablePreview()"
            (rendered)="viewerReady.set(true)">
          </m-molecule-viewer>
        </div>


        <div class="flex-1 min-w-0">
          <div class="text-base font-medium truncate"
               [innerHTML]="highlight(_molecule()?.preferredNameIt ?? undefined)"></div>
          <div class="text-xs text-slate-700 dark:text-slate-200 truncate"
               [innerHTML]="highlight(_molecule()?.synonyms?.[0])"></div>
          <div class="text-xs text-slate-700 dark:text-slate-200 mt-1 flex gap-2">
            @if (_molecule()?.mwFreebase) {
              <span>MW: {{ _molecule()?.mwFreebase | number:'1.0-1' }}</span>
            }
            @if (_molecule()?.maxPhase) {
              <span class="bg-amber-50 text-amber-800 border border-amber-200/70 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-700/40 px-2 py-0.5 rounded">
                Phase {{ _molecule()?.maxPhase }}
              </span>
            }
          </div>
        </div>
      </a>
    } @else {
      <div
        type="button"
        (click)="doEmitChipItem()"
        class="group w-full flex items-center gap-3 cursor-pointer rounded-lg px-3 py-3
               transition-colors hover:bg-indigo-50 dark:hover:bg-slate-700/80
               focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
        title="Clicca per selezionare la molecola"
        role="button"
        [attr.aria-label]="'Seleziona molecola ' + (_molecule()?.preferredNameIt || '')"
      >
        <div class="w-12 h-12 shrink-0 rounded-lg overflow-hidden relative">
          @if (!viewerReady()) {
            <div class="absolute inset-0 z-10 animate-pulse bg-slate-200 dark:bg-slate-700"></div>
          }
          <m-molecule-viewer class="w-full h-full"
            [structure]="_molecule()?.smiles ?? ''"
            [disablePreview]="disablePreview()"
            (rendered)="viewerReady.set(true)">
          </m-molecule-viewer>
        </div>

        <div class="flex-1 min-w-0">
          <div class="text-base font-medium truncate"
               [innerHTML]="highlight(_molecule()?.preferredNameIt ?? undefined)"></div>
          <div class="text-xs text-slate-700 dark:text-slate-200 truncate"
               [innerHTML]="highlight(_molecule()?.synonyms?.[0])"></div>
          <div class="text-xs text-slate-700 dark:text-slate-200 mt-1 flex gap-2">
            @if (_molecule()?.mwFreebase) { <span>MW: {{ _molecule()?.mwFreebase | number:'1.0-1' }}</span> }
            @if (_molecule()?.maxPhase) {
              <span class="bg-amber-50 text-amber-800 border border-amber-200/70 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-700/40 px-2 py-0.5 rounded">Phase {{ _molecule()?.maxPhase }}</span>
            }
          </div>
        </div>
      </div>

    }
  `
})
export class SearchResultComponent implements OnDestroy {

  protected readonly searchContext = inject(SearchContextService)
  private readonly themeManager = inject(ThemeManagerService)
  private readonly zone = inject(NgZone)
  private host = inject(ElementRef<HTMLElement>)
  private readonly design = inject(DesignService)
  private readonly appContext = inject(AppContextService)

  /* segnali originali */
  _molecule = signal<MoleculeSearchResult | undefined>(undefined);
  _pathToMolecule = signal<string>('')
  _query = signal<string>('')
  isDarkMode = signal<boolean>(false)
  viewerReady = signal<boolean>(false)
  _search_excludeAlreadyAdded = signal<boolean>(false)
  isMobile = computed<boolean>(() => this.design.maxBk('sm')())

  /** viewer OFF finché true */
  disablePreview = signal<boolean>(true)

  private seen: boolean = false
  private io!: IntersectionObserver

  /* inputs ---------------------------------- */
  @Input({ required: true })
  set molecule(m: MoleculeSearchResult) {
    this.seen = false;                // <— nuova molecola = nuovo lazy load
    this.viewerReady.set(false);
    this.disablePreview.set(true);

    this._molecule.set(m);
    this._pathToMolecule.set(`molecules/detail/${m.id}`);

    // nel caso l’IO fosse stato detachato:
    this.zone.runOutsideAngular(() => this.io.observe(this.host.nativeElement));
  }


  @Input({ required: true })
  set query(q: string) { this._query.set(q); }

  @Input()
  set search_excludeAlreadyAdded(search_excludeAlreadyAdded: boolean) {
    this._search_excludeAlreadyAdded.set(search_excludeAlreadyAdded)
  }

  @Output()
  onChipItem = new EventEmitter<ChipItem>()

  constructor() {

    /* aggiorna dark mode */
    effect(() => this.isDarkMode.set(this.themeManager.theme() === 'dark'))

    /* Avvia viewer quando card entra nel viewport */
    this.zone.runOutsideAngular(() => {
      this.io = new IntersectionObserver(
        ([entry], observer) => {
          if (entry.isIntersecting && !this.seen) {
            this.seen = true;                    // blocca ulteriori reset
            observer.unobserve(entry.target)   // stacca l’elemento
            this.zone.run(() => this.disablePreview.set(false))
          }
        },
        { rootMargin: '150px', threshold: 0.01 }
      );
      const isInViewport = (el: HTMLElement) =>
        el.getBoundingClientRect().top < window.innerHeight + 150; // stesso rootMargin

      queueMicrotask(() => {
        if (this.disablePreview() && isInViewport(this.host.nativeElement)) {
          this.zone.run(() => this.disablePreview.set(false));
        }
      });
      this.io.observe(this.host.nativeElement);
    });
  }

  /* utils ----------------------------------- */
  highlight(text?: string) {
    const q = this._query();
    if (!text || !q) return text ?? '';
    const esc = q.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
    return text.replace(
      new RegExp(`(${esc})`, 'gi'),
      '<mark class="bg-blue-300/75 dark:bg-blue-300/80 rounded px-1">$1</mark>'
    );
  }

  doEmitChipItem(): void {
    let i = -1
    if (this._molecule()!.synonyms && Array.isArray(this._molecule()!.synonyms)) {
      i = this._molecule()!.synonyms!.findIndex(syn => !!syn)
    }
    this.onChipItem.emit({
      id: String(this._molecule()!.id),
      name: this._molecule()!.preferredNameIt ?? this._molecule()!.preferredName ?? (this._molecule()!.synonyms && i !== -1 ? this._molecule()!.synonyms![i] : `Lead ${this._molecule()!.id}`)
    })
  }

  handleClick(): void {
    queueMicrotask(() => {
      if (this.isMobile()) {
        this.appContext.notifyAddedTriggerCloseOffCanvasMenu()
      }
      this.searchContext.close()
    })
  }

  ngOnDestroy() {
    this.io.disconnect()
  }
}
