import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotebookTree } from '../../../Models/graphql/notebook/notebook.models';
import { routeManifest } from '../../../route-manifest';

type TocMode = 'read' | 'edit';
export type NotebookSelection = { s_id?: string; e_id?: string; x_id?: string };

@Component({
  selector: 'm-notebook-toc',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
  @if (notebook(); as nb) {
    <nav aria-label="Indice del quaderno" class="rounded-lg border p-3">
      <h2 class="mb-3 text-sm font-semibold">Indice</h2>
      <ul class="space-y-2 text-sm">
        <li>
          <a [routerLink]="notebookUrl(nb.id)" class="font-semibold underline underline-offset-2"
            [attr.aria-current]="isSelected('notebook', nb.id) ? 'page' : null">{{ nb.title }}</a>
          <ul class="ml-3 mt-2 space-y-2 border-l pl-3">
            @for (section of nb.sections; track section.id) {
              <li>
                <a [routerLink]="notebookUrl(nb.id)" [queryParams]="{s_id:section.id}"
                  [attr.aria-current]="isSelected('section', section.id) ? 'page' : null"
                  class="underline underline-offset-2">{{ section.title }}</a>
                <ul class="ml-3 mt-2 space-y-2 border-l pl-3">
                  @for (experiment of section.experiments; track experiment.id) {
                    @if (!experiment.archivedAt) {
                      <li>
                        <a [routerLink]="notebookUrl(nb.id)"
                          [queryParams]="{s_id:section.id,e_id:experiment.id}"
                          [attr.aria-current]="isSelected('experiment', experiment.id) ? 'page' : null"
                          class="underline underline-offset-2">{{ experiment.title }}</a>
                        <ul class="ml-3 mt-1 space-y-1 border-l pl-3">
                          @for (execution of experiment.executions; track execution.id) {
                            @if (!execution.archivedAt) {
                              <li>
                                <a [routerLink]="notebookUrl(nb.id)"
                                  [queryParams]="{s_id:section.id,e_id:experiment.id,x_id:execution.id}"
                                  [attr.aria-current]="isSelected('execution', execution.id) ? 'page' : null"
                                  class="underline underline-offset-2">{{ execution.title }}</a>
                                <span class="ml-1 text-xs text-slate-500">{{ execution.status }}</span>
                              </li>
                            }
                          }
                        </ul>
                      </li>
                    }
                  }
                </ul>
              </li>
            }
          </ul>
        </li>
      </ul>
    </nav>
  }
  `,
})
export class NotebookTocComponent {
  readonly notebook = input<NotebookTree | null>(null);
  readonly mode = input<TocMode>('read');
  readonly selectedIds = input<NotebookSelection>({});

  notebookUrl(notebookId: string): string {
    return this.mode() === 'edit'
      ? routeManifest.notebookEditor.build({ notebookId })
      : routeManifest.notebookReader.build({ notebookId });
  }

  isSelected(kind: 'notebook' | 'section' | 'experiment' | 'execution', id: string): boolean {
    const selected = this.selectedIds();
    if (kind === 'notebook') return this.notebook()?.id === id && !selected.s_id;
    if (kind === 'section') return selected.s_id === id && !selected.e_id;
    if (kind === 'experiment') return selected.e_id === id && !selected.x_id;
    return selected.x_id === id;
  }
}
