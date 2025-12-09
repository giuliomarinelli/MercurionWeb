import { AfterViewInit, OnInit, Component, effect, ElementRef, EventEmitter, inject, Input, Output, signal, ViewChild, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { MoleculeSearchService } from '../../../services/graphql/molecule-search.service';
import { MoleculeCollectionItemService } from './../../../services/graphql/molecule-collection-item.service';
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface';
import { AddMoleculesToCollectionContextService } from '../../../services/context/action-context/add-molecules-to-collection-context.service';
import { Helpers } from '../../../helpers';
import { Observable } from 'rxjs';
import { PageModel } from '../../../Models/graphql/page.models';
import { MoleculeCardItemModel } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { AbstractPaginationComponent } from '../../../abstract/abstract-pagination-component';

@Component({
  selector: 'm-molecule-search-input',
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
export class SearchInputComponent extends AbstractPaginationComponent<MoleculeCardItemModel> implements OnDestroy, AfterViewInit {

  private readonly searchService = inject(MoleculeSearchService);
  private readonly moleculeCollectionItemService = inject(MoleculeCollectionItemService);
  private readonly addContext = inject(AddMoleculesToCollectionContextService)

  _search_excludeAlreadyAdded = signal<boolean>(false)
  _viewMode = signal<'my' | 'chembl'>('chembl')

  @ViewChild('searchInput') private searchInputRef!: ElementRef<HTMLInputElement>;

  @Input()
  set search_excludeAlreadyAdded(v: boolean) {
    this._search_excludeAlreadyAdded.set(v)
  }

  @Input()
  set viewMode(viewMode: 'my' | 'chembl') {
    this._search_excludeAlreadyAdded.set(false)
    this._viewMode.set(viewMode)
  }

  @Output()
  onResult = new EventEmitter<MoleculeSearchResult[] | PageModel<MoleculeCardItemModel>>()

  @Output()
  onLoading = new EventEmitter<boolean>()

  @Output()
  onError = new EventEmitter<unknown>()

  @Output()
  onQuery = new EventEmitter<string>()

  @Output()
  onEmpty = new EventEmitter<void>()

  protected override query = signal('')

  private firstTime = signal<boolean>(true)

  constructor() {

    super()

    effect(() => {
      const f = this.firstTime()
      if (f) {
        this.firstTime.set(false)
        return
      }
      const m = this._viewMode()
      if (m === 'my') {
        this.resetPagination()
        queueMicrotask(() => this.loadMore())
      }
    })

    const query$ = toObservable(this.query)

    query$
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(term => {
        const raw = term ?? ''
        const trimmed = raw.trim()

        // sempre notifico la query corrente
        this.onQuery.emit(raw)

        // Stato "vuoto" per < 2 char
        if (trimmed.length < 2 && this._viewMode() === 'my') {
          this.onLoading.emit(false)
          this.searchService.clearResults()
          this.onResult.emit([])
          this.onEmpty.emit()
          return
        }

        this.onLoading.emit(true)
        const req$: Observable<MoleculeSearchResult[] | PageModel<MoleculeCardItemModel>> = this._search_excludeAlreadyAdded()
          ? this.moleculeCollectionItemService.searchChemblMolecules_excludeAlreadyAdded(trimmed, this.addContext.collectionId()!)
          : (
            this._viewMode() === 'chembl' ?
              this.searchService.searchMolecule(trimmed, 100)
              :
              this.fetch$()
          )

        req$.subscribe({
          next: res => {
            this.onResult.emit(res)
            this.onLoading.emit(false)
          },
          error: err => {
            this.onError.emit(err)
            this.onLoading.emit(false)
          }
        })
      })
  }

  protected override clear(): void {
    this.query.set('')
    this.onEmpty.emit()
    queueMicrotask(() => this.searchInputRef.nativeElement.focus())
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      if (!this.query().trim()) {
        this.onEmpty.emit()
      }
      this.searchInputRef.nativeElement.focus()
    })
    if (this._viewMode() === 'my') {
      this.startObserver()
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect()
  }

  protected override fetch$(): Observable<PageModel<MoleculeCardItemModel>> {
    return this.moleculeCollectionItemService.getAllPaginatedItems(this.page, 10, this.searchTerm()).pipe(
      debounceTime(20),
      map(page => ({
        ...page,
        items: page.items.map(mol => Helpers.moleculeClientToCardConverter(mol))
      }))
    )
  }

  protected override doQuery(q: string): void {
    super.query(q)
  }

  protected override doClear(): void {
    super.clear()
  }

}
