import { AfterViewInit, Component, effect, ElementRef, EventEmitter, Output, signal, ViewChild } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MoleculeSearchService } from '../../../services/graphql/molecule-search.service';
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface';


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
        <!-- Icona X SVG -->
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 20 20">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l8 8m0-8l-8 8"/>
        </svg>
      </button>
      }
    </div>

  `
})
export class SearchInputComponent implements AfterViewInit {

  @ViewChild('searchInput')
  private searchInputRef!: ElementRef<HTMLInputElement>

  @Output()
  onResult = new EventEmitter<MoleculeSearchResult[]>()

  @Output()
  onLoading = new EventEmitter<boolean>()

  @Output()
  onError = new EventEmitter<unknown>()

  @Output()
  onQuery = new EventEmitter<string>()

  @Output()
  onEmpty = new EventEmitter<void>()

  query = signal('')

  constructor(private readonly searchService: MoleculeSearchService) {

    effect(() => {
      if (!this.query().trim()) {
        this.onEmpty.emit()
      }
    })

    const query$ = toObservable(this.query)

    query$
      .pipe(debounceTime(80), distinctUntilChanged())
      .subscribe(term => {
        this.onQuery.emit(this.query())
        const trimmed = term.trim()
        if (!trimmed) {
          this.onEmpty.emit()
          return
        }
        if (trimmed.length > 1) {
          this.onLoading.emit(true)
          this.searchService.searchMolecule(trimmed, 100).subscribe({
            next: res => {
              this.onResult.emit(res)
              this.onLoading.emit(false)
            },
            error: err => {
              this.onError.emit(err)
              this.onLoading.emit(false)
            }
          })
        } else {
          this.searchService.clearResults()
          this.onResult.emit([])
        }
      })

  }

  clear(): void {
    this.query.set('')
    this.onEmpty.emit()
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.searchInputRef.nativeElement.focus())
  }
}
