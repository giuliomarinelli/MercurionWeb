import { Component, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { SearchService } from '../../../services/search.service';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-input.component.html',
})
export class SearchInputComponent {

  query = signal('')

  constructor(private readonly searchService: SearchService) {

    const query$ = toObservable(this.query)

    query$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(term => {
        const trimmed = term.trim();
        if (trimmed.length > 1) {
          this.searchService.searchMolecule(trimmed)
        }
      })

  }
}
