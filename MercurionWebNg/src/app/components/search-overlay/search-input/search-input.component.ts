import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-input.component.html',
})
export class SearchInputComponent {

  query: string = ''

  @Output() search = new EventEmitter<string>()

  submit() {
    const trimmed = this.query.trim()
    if (trimmed) {
      this.search.emit(trimmed)
    }
  }

  onEnter() {
    this.submit()
  }
}
