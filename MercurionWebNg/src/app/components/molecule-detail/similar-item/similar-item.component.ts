import {
  Component, Input, signal, effect,
  ElementRef, OnDestroy,
  NgZone
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe, NgClass } from '@angular/common';
import { MoleculeViewerComponent } from '../../chem/molecule-viewer/molecule-viewer.component';
import { SearchContextService } from '../../../services/context/search-context.service';
import { ThemeManagerService } from '../../../services/context/theme-manager.service';
import { MoleculeSearchResult } from
  '../../../Models/graphql/molecule-search/molecule-search-result.interface';

@Component({
  selector: 'app-similar-item',
  standalone: true,
  imports: [DecimalPipe, RouterLink, MoleculeViewerComponent, NgClass],
  template: `
    <a [routerLink]="_pathToMolecule()" (click)="searchContext.close()"
        [ngClass]="{
          'bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-slate-800': _i() % 2 !== 0,
          'hover:bg-slate-100/40 dark:hover:bg-slate-700': _i() % 2 === 0
          }"
       class="flex items-center gap-3 p-3 cursor-pointer transition h-[90px]">

      <div class="w-12 h-12 flex-shrink-0 overflow-hidden relative">
        @if (!viewerReady()) {
          <div class="absolute inset-0 z-10 animate-pulse
                      bg-slate-200 dark:bg-slate-700"></div>
        }

        <molecule-viewer
          class="w-full h-full"
          [structure]="_molecule()?.smiles ?? ''"
          [disablePreview]="disablePreview()"
          (rendered)="viewerReady.set(true)">
        </molecule-viewer>
      </div>





      <div class="flex-1 min-w-0">
        <div class="text-base font-medium truncate"
             [innerHTML]="_molecule()?.preferredNameIt"></div>
        <div class="text-xs text-gray-500 truncate"
             [innerHTML]="_molecule()?.synonyms?.[0]"></div>
        <div class="text-xs text-gray-400 mt-1 flex gap-2">
          @if (_molecule()?.mwFreebase) {
            <span>MW: {{ _molecule()?.mwFreebase | number:'1.0-1' }}</span>
          }
          @if (_molecule()?.maxPhase) {
            <span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
              Phase {{ _molecule()?.maxPhase }}
            </span>
          }
        </div>
      </div>
    </a>
  `
})
export class SimilarItemComponent implements OnDestroy {

  /* segnali originali */
  _molecule = signal<MoleculeSearchResult | undefined>(undefined);
  _pathToMolecule = signal<string>('')
  _query = signal<string>('')
  _i = signal<number>(0)
  isDarkMode = signal<boolean>(false)
  viewerReady = signal<boolean>(false)

  /** viewer OFF finché true */
  disablePreview = signal<boolean>(true)

  private seen: boolean = false
  private io!: IntersectionObserver

  constructor(
    protected readonly searchContext: SearchContextService,
    private readonly themeManager: ThemeManagerService,
    private readonly zone: NgZone,
    private host: ElementRef<HTMLElement>
  ) {
    /* aggiorna dark mode */
    effect(() => this.isDarkMode.set(this.themeManager.theme() === 'dark'));
    console.log(this._molecule() === undefined)
    /* Avvia viewer quando card entra nel viewport */
    this.zone.runOutsideAngular(() => {
      this.io = new IntersectionObserver(
        ([entry], observer) => {
          if (entry.isIntersecting && !this.seen) {
            this.seen = true;                    // blocca ulteriori reset
            observer.unobserve(entry.target);    // stacca l’elemento
            this.zone.run(() => this.disablePreview.set(false));
          }
        },
        { rootMargin: '150px', threshold: 0.01 }
      );
      const isInViewport = (el: HTMLElement) =>
        el.getBoundingClientRect().top < window.innerHeight + 150; // stesso rootMargin

      queueMicrotask(() => {
        if (this.disablePreview() && isInViewport(host.nativeElement)) {
          this.zone.run(() => this.disablePreview.set(false));
        }
      });
      this.io.observe(host.nativeElement);
    });
  }


  /* inputs ---------------------------------- */
  @Input({ required: true })
  set molecule(m: MoleculeSearchResult) {
    this.seen = false;                // <— nuova molecola = nuovo lazy load
    this.viewerReady.set(false);
    this.disablePreview.set(true);

    this._molecule.set(m);
    this._pathToMolecule.set(`/molecules/detail/${m.id}`);

    // nel caso l’IO fosse stato detachato:
    this.zone.runOutsideAngular(() => this.io.observe(this.host.nativeElement));
  }

  @Input({ required: true })
  set i(i: number) {
    this._i.set(i)
  }

  ngOnDestroy() {
    this.io.disconnect();
  }
}
