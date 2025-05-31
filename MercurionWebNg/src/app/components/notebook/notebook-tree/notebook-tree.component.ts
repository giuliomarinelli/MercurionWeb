import { Component, Input, signal, Signal } from '@angular/core';
import { NotebookTree } from '../../../Models/graphql/notebook/notebook.models';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-notebook-tree',
  imports: [],
  template: `



<ul>
  @for (nb of _notebooks(); track nb) {
  <li>
    <div class="font-bold">{{ nb.title }}</div>
    <ul>
      @for (chapter of nb.chapters; track chapter) {
      <li>
        <div class="flex items-center">
          <button (click)="toggleChapter(chapter.id)">
            @if (expandedChapters()[chapter.id]) {
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="fill-current w-auto h-5">
                <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M256 429.3l22.6-22.6 192-192L493.3 192 448 146.7l-22.6 22.6L256 338.7 86.6 169.4 64 146.7 18.7 192l22.6 22.6 192 192L256 429.3z"/>
              </svg>
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" class="fill-current w-auto h-5">
                <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M317.3 256l-22.6 22.6-192 192L80 493.3 34.7 448l22.6-22.6L226.7 256 57.4 86.6 34.7 64 80 18.7l22.6 22.6 192 192L317.3 256z"/>
              </svg>
            }
          </button>
          {{ chapter.title }}
          <button>+</button>
        </div>
        @if (expandedChapters()[chapter.id]) {
          <ul>
          @for (section of chapter.sections; track section) {
            <li>
            <div class="flex items-center ml-4">
              <button (click)="toggleSection(section.id)">
                @if (expandedSections()[section.id]) {
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="fill-current w-auto h-5">
                <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M256 429.3l22.6-22.6 192-192L493.3 192 448 146.7l-22.6 22.6L256 338.7 86.6 169.4 64 146.7 18.7 192l22.6 22.6 192 192L256 429.3z"/>
              </svg>
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" class="fill-current w-auto h-5">
                <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M317.3 256l-22.6 22.6-192 192L80 493.3 34.7 448l22.6-22.6L226.7 256 57.4 86.6 34.7 64 80 18.7l22.6 22.6 192 192L317.3 256z"/>
              </svg>
            }
              </button>
              {{ section.title }}
              <!-- No pagine qui -->
              <button disabled>+ pagina</button>
            </div>
            </li>
          }
          </ul>
        }
      </li>
      }
    </ul>
  </li>
  }
</ul>


  `
})
export class NotebookTreeComponent {

  _notebooks = signal<NotebookTree[]>([])

  @Input()
  set notebooks(notebooks: NotebookTree[]) {
    this._notebooks.set(notebooks)
  }

  // Stato espansione
  expandedChapters = signal<{[id: string]: boolean}>({});
  expandedSections = signal<{[id: string]: boolean}>({});

  toggleChapter(id: string) {
    this.expandedChapters.update(state => ({...state, [id]: !state[id]}));
  }
  toggleSection(id: string) {
    this.expandedSections.update(state => ({...state, [id]: !state[id]}));
  }

}
