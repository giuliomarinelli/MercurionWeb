import { Component, Input, signal } from '@angular/core';
import { NotebookTree, SectionTree, PageTree } from '../../../Models/graphql/notebook/notebook.models';
import { NotebookService } from '../../../services/graphql/notebook.service';

@Component({
  selector: 'app-notebook-tree',
  template: `
<ul>
  @for (nb of _notebooks(); track nb) {
    <li>
      <div class="font-bold flex items-center gap-2">
        {{ nb.title }}
        <button (click)="addChapter(nb.id)">+ Capitolo</button>
      </div>
      <ul>
        @for (chapter of nb.chapters; track chapter) {
          <li>
            <div class="flex items-center gap-2">
              <button (click)="toggleChapter(chapter.id)">
                @if (expandedChapters()[chapter.id]) {
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="fill-current w-auto h-5"><path d="M256 429.3l22.6-22.6 192-192L493.3 192 448 146.7l-22.6 22.6L256 338.7 86.6 169.4 64 146.7 18.7 192l22.6 22.6 192 192L256 429.3z"/></svg>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" class="fill-current w-auto h-5"><path d="M317.3 256l-22.6 22.6-192 192L80 493.3 34.7 448l22.6-22.6L226.7 256 57.4 86.6 34.7 64 80 18.7l22.6 22.6 192 192L317.3 256z"/></svg>
                }
              </button>
              {{ chapter.title }}
              <button (click)="renameChapter(chapter.id, chapter.title)">✏️</button>
              <button (click)="deleteChapter(chapter.id)">🗑️</button>
              <button (click)="addSection(chapter.id)">+ Sezione</button>
            </div>
            @if (expandedChapters()[chapter.id]) {
              <ul>
                @for (section of chapter.sections; track section) {
                  <li>
                    <div class="flex flex-col ml-4">
                      <div class="flex items-center gap-2">
                        <button (click)="toggleSection(section.id)">
                          @if (expandedSections()[section.id]) {
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="fill-current w-auto h-5"><path d="M256 429.3l22.6-22.6 192-192L493.3 192 448 146.7l-22.6 22.6L256 338.7 86.6 169.4 64 146.7 18.7 192l22.6 22.6 192 192L256 429.3z"/></svg>
                          } @else {
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" class="fill-current w-auto h-5"><path d="M317.3 256l-22.6 22.6-192 192L80 493.3 34.7 448l22.6-22.6L226.7 256 57.4 86.6 34.7 64 80 18.7l22.6 22.6 192 192L317.3 256z"/></svg>
                          }
                        </button>
                        {{ section.title }}
                        <button (click)="renameSection(section.id, section.title)">✏️</button>
                        <button (click)="deleteSection(section.id)">🗑️</button>
                        <button (click)="addPage(section)">+ pagina</button>
                      </div>
                      <!-- Pagine -->
                      @if (expandedSections()[section.id]) {
                        <ul>
                          @for (page of section.pages; track page) {
                            <li class="flex items-center gap-2 ml-7">
                              <span>{{ page.title }}</span>
                              <button (click)="renamePage(page, section)">✏️</button>
                              <button (click)="deletePage(page.id, section)">🗑️</button>
                            </li>
                          }
                        </ul>
                      }
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
  _notebooks = signal<NotebookTree[]>([]);

  @Input()
  set notebooks(notebooks: NotebookTree[]) {
    this._notebooks.set(notebooks)
  }

  expandedChapters = signal<{ [id: string]: boolean }>({});
  expandedSections = signal<{ [id: string]: boolean }>({});

  constructor(private notebookService: NotebookService) { }

  toggleChapter(id: string) {
    this.expandedChapters.update(state => ({ ...state, [id]: !state[id] }));
  }
  toggleSection(id: string) {
    this.expandedSections.update(state => ({ ...state, [id]: !state[id] }));
  }

  // === CRUD CHAPTER
  addChapter(notebookId: string) {
    const title = prompt('Nome nuovo capitolo?');
    if (title) this.notebookService.createChapter(notebookId, title).subscribe();
  }
  renameChapter(id: string, oldTitle: string) {
    const title = prompt('Nuovo nome capitolo:', oldTitle);
    if (title && title.trim() && title !== oldTitle) {
      this.notebookService.updateChapter(id, title.trim()).subscribe();
    }
  }
  deleteChapter(id: string) {
    if (confirm('Eliminare capitolo?')) {
      this.notebookService.deleteChapter(id).subscribe();
    }
  }

  // === CRUD SECTION
  addSection(chapterId: string) {
    const title = prompt('Nome nuova sezione?');
    if (title) this.notebookService.createSection(chapterId, title).subscribe();
  }
  renameSection(id: string, oldTitle: string) {
    const title = prompt('Nuovo nome sezione:', oldTitle);
    if (title && title.trim() && title !== oldTitle) {
      this.notebookService.updateSection(id, title.trim()).subscribe();
    }
  }
  deleteSection(id: string) {
    if (confirm('Eliminare sezione?')) {
      this.notebookService.deleteSection(id).subscribe();
    }
  }

  // === CRUD PAGINE
  addPage(section: SectionTree) {
    const title = prompt('Titolo pagina?');
    if (!title) return;
    const content = prompt('Contenuto (opzionale)?') ?? '';
    this.notebookService.createPage(section.id, title, content).subscribe();
  }
  renamePage(page: PageTree, section: SectionTree) {
    const newTitle = prompt('Nuovo titolo pagina:', page.title) ?? page.title;
    if (!newTitle || newTitle === page.title) return;
    // Qui potresti volere anche edit del contenuto (non solo titolo)
    this.notebookService.updatePage(page.id, newTitle, page.title ?? '').subscribe()
  }
  deletePage(pageId: string, section: SectionTree) {
    if (confirm('Eliminare pagina?')) {
      this.notebookService.deletePage(pageId).subscribe()
    }
  }
}
