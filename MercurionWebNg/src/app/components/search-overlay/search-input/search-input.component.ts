import { AfterViewInit, OnInit, Component, effect, ElementRef, EventEmitter, inject, Input, Output, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MoleculeSearchService } from '../../../services/graphql/molecule-search.service';
import { MoleculeCollectionItemService } from './../../../services/graphql/molecule-collection-item.service';
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface';
import { AddMoleculesToCollectionContextService } from '../../../services/context/action-context/add-molecules-to-collection-context.service';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex gap-2 items-center relative">
      <input
        #searchInput
        type="text"
        placeholder="Cerca molecola..."
        class="flex-1 px-4 py-2 rounded-lg bg-white/90 text-black placeholder:text-gray-500 shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 transition w-full"
        [ngModel]="query()"
        (ngModelChange)="query.set($event)"
        [class.pr-10]="query().trim()"
        [class.pl-4]="query().trim()"
        [class.px-4]="!query().trim()"
      />
      @if (query().trim()) {
        <button type="button"
                (click)="clear()"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-500 transition"
                tabindex="-1"
                aria-label="Cancella ricerca">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 20 20">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l8 8m0-8l-8 8"/>
          </svg>
        </button>
      }
    </div>
  `
})
export class SearchInputComponent implements AfterViewInit {

  private readonly searchService = inject(MoleculeSearchService);
  private readonly moleculeCollectionItemService = inject(MoleculeCollectionItemService);
  private readonly addContext = inject(AddMoleculesToCollectionContextService)

  _search_excludeAlreadyAdded = signal<boolean>(false);

  @ViewChild('searchInput') private searchInputRef!: ElementRef<HTMLInputElement>;

  @Input()
  set search_excludeAlreadyAdded(v: boolean) { this._search_excludeAlreadyAdded.set(v); }

  @Output() onResult = new EventEmitter<MoleculeSearchResult[]>();
  @Output() onLoading = new EventEmitter<boolean>();
  @Output() onError = new EventEmitter<unknown>();
  @Output() onQuery = new EventEmitter<string>();
  @Output() onEmpty = new EventEmitter<void>();

  query = signal('');

  // ⛔️ rimosso l'effect nel constructor: emetteva troppo presto

  constructor() {
    const query$ = toObservable(this.query);

    query$
      .pipe(
        debounceTime(120),
        distinctUntilChanged()
      )
      .subscribe(term => {
        const raw = term ?? '';
        const trimmed = raw.trim();

        // sempre notifico la query corrente
        this.onQuery.emit(raw);

        // Stato "vuoto" per < 2 char
        if (trimmed.length < 2) {
          this.onLoading.emit(false);
          this.searchService.clearResults();
          this.onResult.emit([]);
          this.onEmpty.emit();
          return;
        }

        // Ricerca
        this.onLoading.emit(true);
        const req$ = this._search_excludeAlreadyAdded()
          ? this.moleculeCollectionItemService.searchChemblMolecules_excludeAlreadyAdded(trimmed, this.addContext.collectionId()!)
          : this.searchService.searchMolecule(trimmed, 100);

        req$.subscribe({
          next: res => { this.onResult.emit(res); this.onLoading.emit(false); },
          error: err => { this.onError.emit(err); this.onLoading.emit(false); }
        });
      });
  }

  clear(): void {
    this.query.set('');
    // emetto subito per garantire sincronizzazione UI
    this.onEmpty.emit();
    queueMicrotask(() => this.searchInputRef.nativeElement.focus());
  }

  ngAfterViewInit(): void {
    // assicura l’empty iniziale quando il parent ha già i listener
    queueMicrotask(() => {
      if (!this.query().trim()) this.onEmpty.emit();
      this.searchInputRef.nativeElement.focus();
    });
  }
}
