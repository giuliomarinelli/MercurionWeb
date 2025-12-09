import { Component, Input } from '@angular/core';
import { NotebookTree, ChapterTree, SectionTree, PageTree } from '../../../Models/graphql/notebook/notebook.models';
import { RouterModule } from '@angular/router';

type TocMode = 'edit' | 'read';

@Component({
  selector: 'm-notebook-toc',
  standalone: true,
  imports: [RouterModule],
  template: `
    <ul class="flex flex-wrap gap-3 text-xs px-2 py-2 border-b">
      @if (notebook) {
        <li>
          <a [routerLink]="['/notebook', notebook.id, mode]"
             class="font-bold underline underline-offset-2"
             [class.text-sky-800]="isSelected('notebook', notebook.id)">
            {{ truncate(notebook.title) }}
          </a>
          @if (notebook.chapters.length) {
            <ul class="ml-3">
              @for (chapter of notebook.chapters; track chapter.id) {
                <li>
                  <a [routerLink]="['/notebook', notebook.id, mode]"
                     [queryParams]="{ c_id: chapter.id }"
                     class="font-semibold"
                     [class.text-sky-700]="isSelected('chapter', chapter.id)">
                    {{ truncate(chapter.title) }}
                  </a>
                  @if (chapter.sections.length) {
                    <ul class="ml-3">
                      @for (section of chapter.sections; track section.id) {
                        <li>
                          <a [routerLink]="['/notebook', notebook.id,mode]"
                             [queryParams]="{ c_id: chapter.id, s_id: section.id }"
                             [class.text-sky-600]="isSelected('section', section.id)">
                            {{ truncate(section.title) }}
                          </a>
                          @if (section.pages.length) {
                            <ul class="ml-3">
                              @for (page of section.pages; track page.id) {
                                <li>
                                  <a [routerLink]="['/notebook', notebook.id, mode]"
                                     [queryParams]="{ c_id: chapter.id, s_id: section.id, p_id: page.id }"
                                     [class.text-sky-500]="isSelected('page', page.id)">
                                    {{ truncate(page.title) }}
                                  </a>
                                </li>
                              }
                            </ul>
                          }
                        </li>
                      }
                    </ul>
                  }
                </li>
              }
            </ul>
          }
        </li>
      }
    </ul>
  `,
  styles: [`
    a {
      cursor: pointer; transition: color .13s
    }
    .font-bold, .font-semibold {
      display: inline-block;
      max-width: 180px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      vertical-align: bottom;
    }
  `]
})
export class NotebookTocComponent {

  @Input() notebook?: NotebookTree
  @Input() chapter?: ChapterTree
  @Input() section?: SectionTree
  @Input() mode: TocMode = 'read'
  @Input() selectedIds?: { c_id?: string, s_id?: string, p_id?: string }

  truncate(str: string, n = 22): string {
    return str.length > n ? str.slice(0, n - 1) + '…' : str
  }

  isSelected(type: 'notebook' | 'chapter' | 'section' | 'page', id: string): boolean {
    if (!this.selectedIds) return false
    if (type === 'notebook') return !!this.notebook && this.notebook.id === id
    if (type === 'chapter') return this.selectedIds.c_id === id && !this.selectedIds.s_id
    if (type === 'section') return this.selectedIds.s_id === id && !this.selectedIds.p_id
    if (type === 'page') return this.selectedIds.p_id === id
    return false
  }
}
