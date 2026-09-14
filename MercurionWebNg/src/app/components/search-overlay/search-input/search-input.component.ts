import {
  Component,
  ChangeDetectionStrategy,
  effect,
  OnDestroy,
  inject,
  signal,
  input,
  output
} from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'
import { EMPTY, Subscription, catchError, finalize, switchMap, tap } from 'rxjs'
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface'
import { PageModel } from '../../../Models/graphql/page.models'
import { MoleculeCardItemModel } from '../../../Models/graphql/molecule-collection/molecule-collection.types'
import { MoleculeCollectionItemService } from '../../../services/graphql/molecule-collection-item.service'
import { AddMoleculesToCollectionContextService } from '../../../services/context/action-context/add-molecules-to-collection-context.service'
import { UserContextService } from '../../../services/context/user-context.service'
import { MoleculeSearchService } from '../../../services/graphql/molecule-search.service'
import { SearchFieldComponent } from '../../common/search-field/search-field.component'

@Component({
  selector: 'm-molecule-search-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SearchFieldComponent],
  template: `
    <m-search-field
      [value]="query()"
      [label]="ariaLabel() || (userContext.isLoggedOut() ? 'Cerca molecola ChEMBL' : 'Cerca molecola')"
      [placeholder]="userContext.isLoggedOut() ? 'Cerca molecola ChEMBL...' : 'Cerca molecola...'"
      [pending]="loading()"
      (valueChange)="query.set($event)"
      (cleared)="clear()" />
  `
})
export class SearchInputComponent implements OnDestroy {

  private readonly moleculeCollectionItemService = inject(MoleculeCollectionItemService)
  private readonly addContext = inject(AddMoleculesToCollectionContextService)
  protected readonly userContext = inject(UserContextService)
  private readonly moleculeSearchService = inject(MoleculeSearchService)

  protected query = signal('')
  readonly loading = signal(false)

  private _search_excludeAlreadyAdded = signal(false)
  private _viewMode = signal<'my' | 'chembl'>('chembl')

  private sub?: Subscription

  readonly search_excludeAlreadyAdded = input(false)
  readonly viewMode = input<'my' | 'chembl'>('chembl')

  readonly ariaLabel = input<string>();

  readonly onResult = output<MoleculeSearchResult[] | PageModel<MoleculeCardItemModel>>();

  readonly onLoading = output<boolean>();

  readonly onError = output<unknown>();

  readonly onQuery = output<string>();

  readonly onEmpty = output<void>();

  constructor() {
    effect(() => this._search_excludeAlreadyAdded.set(this.search_excludeAlreadyAdded()))
    effect(() => this._viewMode.set(this.viewMode()))
    const query$ = toObservable(this.query)

    this.sub = query$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(raw => this.onQuery.emit(raw ?? '')),
        switchMap(raw => {
          const value = raw ?? ''
          const trimmed = value.trim()
          const mode = this._viewMode()
          const exclude = this._search_excludeAlreadyAdded()

          // The input is a latest-wins flow: changing the query cancels its request.
          if (!exclude) {
            if (mode === 'chembl' && trimmed.length < 2) {
              // TODO: The 'emit' function requires a mandatory void argument
              this.onEmpty.emit()
            }
            return EMPTY
          }

          if (trimmed.length < 2) {
            this.loading.set(false)
            this.onLoading.emit(false)
            this.onResult.emit([])
            // TODO: The 'emit' function requires a mandatory void argument
            this.onEmpty.emit()
            return EMPTY
          }

          const collectionId = this.addContext.collectionId()
          this.loading.set(true)
          this.onLoading.emit(true)

          const request$ = collectionId
            ? this.moleculeCollectionItemService
              .searchChemblMolecules_excludeAlreadyAdded(trimmed, collectionId)
            : this.moleculeSearchService.searchMolecule(trimmed, 100)

          return request$.pipe(
            catchError(err => {
              this.onError.emit(err)
              return EMPTY
            }),
            finalize(() => {
              this.loading.set(false)
              this.onLoading.emit(false)
            })
          )
        })
      )
      .subscribe(res => this.onResult.emit(res ?? []))
  }

  clear(): void {
    this.query.set('')
    this.loading.set(false)
    // TODO: The 'emit' function requires a mandatory void argument
    this.onEmpty.emit()
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe()
  }
}
