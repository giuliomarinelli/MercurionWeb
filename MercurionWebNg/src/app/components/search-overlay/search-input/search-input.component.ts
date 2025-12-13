import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  inject,
  signal
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { toObservable } from '@angular/core/rxjs-interop'
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'
import { Subscription } from 'rxjs'
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface'
import { PageModel } from '../../../Models/graphql/page.models'
import { MoleculeCardItemModel } from '../../../Models/graphql/molecule-collection/molecule-collection.types'
import { MoleculeCollectionItemService } from '../../../services/graphql/molecule-collection-item.service'
import { AddMoleculesToCollectionContextService } from '../../../services/context/action-context/add-molecules-to-collection-context.service'
import { UserContextService } from '../../../services/context/user-context.service'

@Component({
  selector: 'm-molecule-search-input',
  imports: [FormsModule],
  template: `
    <div class="flex gap-2 items-center relative">
      <input
        #searchInput
        type="text"
        [placeholder]="userContext.isLoggedOut() ? 'Cerca molecola ChEMBL...' : 'Cerca molecola...'"
        class="flex-1 px-4 py-2 rounded-xl bg-white/95 dark:bg-white/5
         text-black dark:text-white placeholder:text-gray-500 dark:placeholder:text-slate-400
         shadow-sm ring-1 ring-slate-200/70 dark:ring-white/10
         focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:ring-offset-0
         transition w-full"
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
export class SearchInputComponent implements AfterViewInit, OnDestroy {

  private readonly moleculeCollectionItemService = inject(MoleculeCollectionItemService)
  private readonly addContext = inject(AddMoleculesToCollectionContextService)
  protected readonly userContext = inject(UserContextService)

  protected query = signal('')

  private _search_excludeAlreadyAdded = signal(false)
  private _viewMode = signal<'my' | 'chembl'>('chembl')

  private sub?: Subscription

  @ViewChild('searchInput')
  private searchInputRef!: ElementRef<HTMLInputElement>

  @Input()
  set search_excludeAlreadyAdded(v: boolean) {
    this._search_excludeAlreadyAdded.set(v)
  }

  @Input()
  set viewMode(mode: 'my' | 'chembl') {
    this._viewMode.set(mode)
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

  constructor() {
    const query$ = toObservable(this.query)

    this.sub = query$
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(raw => {
        const value = raw ?? ''
        const trimmed = value.trim()
        const mode = this._viewMode()
        const exclude = this._search_excludeAlreadyAdded()

        // Sempre notifico la query corrente
        this.onQuery.emit(value)

        // Caso overlay "normale": niente HTTP qui, pensa il padre
        if (!exclude) {
          if (mode === 'chembl' && trimmed.length < 2) {
            this.onEmpty.emit()
          }
          return
        }

        // Caso legacy: search_excludeAlreadyAdded = true
        if (trimmed.length < 2) {
          this.onLoading.emit(false)
          this.onResult.emit([])
          this.onEmpty.emit()
          return
        }

        const collectionId = this.addContext.collectionId()
        if (!collectionId) {
          this.onLoading.emit(false)
          this.onResult.emit([])
          return
        }

        this.onLoading.emit(true)

        this.moleculeCollectionItemService
          .searchChemblMolecules_excludeAlreadyAdded(trimmed, collectionId)
          .subscribe({
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

  clear(): void {
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
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe()
  }
}
