import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { NotebookTree, NotebookNodeKind } from '../../../Models/graphql/notebook/notebook.models';
import { NotebookService } from '../../../services/graphql/notebook.service';
import { routeManifest } from '../../../route-manifest';

type DraftAction = 'create' | 'rename';
type DraftState = {
  action: DraftAction;
  kind: NotebookNodeKind;
  parentId: string;
  id?: string;
  value: string;
};

@Component({
  selector: 'm-notebook-tree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink],
  template: `
  <nav aria-label="Indice dei quaderni di laboratorio">
    @if (mode() === 'edit') {
      <button type="button" class="rounded-md border px-3 py-1.5 text-sm mb-3"
        (click)="startCreate('notebook', '')">Nuovo quaderno</button>
    }

    @if (draft(); as editor) {
      <form (ngSubmit)="saveDraft()" class="mb-4 flex flex-wrap gap-2 items-center rounded-md border p-3">
        <label class="text-sm font-medium" for="notebook-node-title">
          {{ editor.action === 'create' ? 'Crea' : 'Rinomina' }} {{ kindLabel(editor.kind) }}
        </label>
        <input id="notebook-node-title" name="title" required maxlength="255" class="rounded-md border px-2 py-1"
          [disabled]="pending()" [ngModel]="editor.value"
          (ngModelChange)="updateDraft($event)">
        <button type="submit" class="rounded-md border px-3 py-1" [disabled]="pending() || !editor.value.trim()">Salva</button>
        <button type="button" class="rounded-md px-3 py-1" [disabled]="pending()" (click)="draft.set(null)">Annulla</button>
      </form>
    }

    @if (error()) {
      <p role="alert" class="mb-3 text-red-700 dark:text-red-300">{{ error() }}</p>
    }

    <ul class="space-y-3">
      @for (notebook of notebooks(); track notebook.id) {
        @if (!notebook.archivedAt || showArchived()) {
          <li class="rounded-lg border p-3">
            <div class="flex flex-wrap items-center gap-2">
              <a class="font-semibold underline underline-offset-2"
                [routerLink]="readUrl(notebook.id)">{{ notebook.title }}</a>
              @if (notebook.archivedAt) { <span class="text-xs italic">Archiviato</span> }
              @if (mode() === 'edit' && !notebook.archivedAt) {
                <button class="rounded border px-2 py-1 text-xs" (click)="startCreate('section', notebook.id)">+ Sezione</button>
                <button class="rounded border px-2 py-1 text-xs" (click)="startRename('notebook', notebook.id, notebook.title)">Rinomina</button>
                <button class="rounded border px-2 py-1 text-xs" (click)="archive('notebook', notebook.id)">Archivia</button>
              }
              <a class="text-xs underline" [routerLink]="editUrl(notebook.id)">Apri editor</a>
            </div>
            <ul class="mt-2 ml-3 space-y-2 border-l pl-3">
              @for (section of notebook.sections; track section.id) {
                <li>
                  <div class="flex flex-wrap items-center gap-2">
                    <a class="font-medium underline" [routerLink]="readUrl(notebook.id)"
                      [queryParams]="{s_id: section.id}">{{ section.title }}</a>
                    @if (mode() === 'edit' && !notebook.archivedAt) {
                      <button class="rounded border px-2 py-1 text-xs" (click)="startCreate('experiment', section.id)">+ Esperimento</button>
                      <button class="rounded border px-2 py-1 text-xs" (click)="startRename('section', section.id, section.title)">Rinomina</button>
                    }
                  </div>
                  <ul class="ml-3 mt-1 space-y-2 border-l pl-3">
                    @for (experiment of section.experiments; track experiment.id) {
                      @if (!experiment.archivedAt || showArchived()) {
                        <li>
                          <div class="flex flex-wrap items-center gap-2">
                            <a class="underline" [routerLink]="readUrl(notebook.id)"
                              [queryParams]="{s_id:section.id,e_id:experiment.id}">{{ experiment.title }}</a>
                            @if (experiment.archivedAt) { <span class="text-xs italic">Archiviato</span> }
                            @if (mode() === 'edit' && !experiment.archivedAt && !notebook.archivedAt) {
                              <button class="rounded border px-2 py-1 text-xs" (click)="startCreate('execution', experiment.id)">+ Esecuzione</button>
                              <button class="rounded border px-2 py-1 text-xs" (click)="startRename('experiment', experiment.id, experiment.title)">Rinomina</button>
                              <button class="rounded border px-2 py-1 text-xs" (click)="archive('experiment', experiment.id)">Archivia</button>
                            }
                          </div>
                          <ul class="ml-3 mt-1 space-y-1 border-l pl-3">
                            @for (execution of experiment.executions; track execution.id) {
                              @if (!execution.archivedAt || showArchived()) {
                                <li class="flex flex-wrap items-center gap-2">
                                  <a class="underline" [routerLink]="readUrl(notebook.id)"
                                    [queryParams]="{s_id:section.id,e_id:experiment.id,x_id:execution.id}">{{ execution.title }}</a>
                                  <span class="text-xs text-slate-600 dark:text-slate-300">{{ execution.status }}</span>
                                  @if (mode() === 'edit' && !execution.archivedAt && !experiment.archivedAt && !notebook.archivedAt) {
                                    <button class="rounded border px-2 py-1 text-xs" (click)="startRename('execution', execution.id, execution.title)">Rinomina</button>
                                    <button class="rounded border px-2 py-1 text-xs" (click)="archive('execution', execution.id)">Archivia</button>
                                  }
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
        }
      }
    </ul>

    <button type="button" class="mt-3 text-sm underline"
      [attr.aria-pressed]="showArchived()" (click)="showArchived.update(value => !value)">
      {{ showArchived() ? 'Nascondi archiviati' : 'Mostra archiviati' }}
    </button>
  </nav>
  `,
})
export class NotebookTreeComponent {
  private readonly notebookService = inject(NotebookService);
  private readonly destroyRef = inject(DestroyRef);

  readonly notebooks = input<NotebookTree[]>([]);
  readonly mode = input<'read' | 'edit'>('read');
  readonly changed = output<void>();
  readonly draft = signal<DraftState | null>(null);
  readonly error = signal<string | null>(null);
  readonly pending = signal(false);
  readonly showArchived = signal(false);

  readUrl(notebookId: string): string {
    return routeManifest.notebookReader.build({ notebookId });
  }

  editUrl(notebookId: string): string {
    return routeManifest.notebookEditor.build({ notebookId });
  }

  kindLabel(kind: NotebookNodeKind): string {
    return ({
      notebook: 'quaderno', section: 'sezione',
      experiment: 'esperimento', execution: 'esecuzione'
    } as const)[kind];
  }

  startCreate(kind: NotebookNodeKind, parentId: string): void {
    this.error.set(null);
    this.draft.set({ action: 'create', kind, parentId, value: '' });
  }

  startRename(kind: NotebookNodeKind, id: string, title: string): void {
    this.error.set(null);
    this.draft.set({ action: 'rename', kind, parentId: '', id, value: title });
  }

  updateDraft(value: string): void {
    this.draft.update(draft => draft ? { ...draft, value } : null);
  }

  saveDraft(): void {
    const form = this.draft();
    if (!form || this.pending()) return;
    const title = form.value.trim();
    if (!title) return;

    let request: Observable<unknown>;
    if (form.action === 'create') {
      switch (form.kind) {
        case 'notebook': request = this.notebookService.createNotebook(title); break;
        case 'section': request = this.notebookService.createSection(form.parentId, title); break;
        case 'experiment': request = this.notebookService.createExperiment(form.parentId, title); break;
        case 'execution': request = this.notebookService.createExecution(form.parentId, title); break;
      }
    } else {
      if (!form.id) return;
      switch (form.kind) {
        case 'notebook': request = this.notebookService.updateNotebook(form.id, { title }); break;
        case 'section': request = this.notebookService.updateSection(form.id, { title }); break;
        case 'experiment': request = this.notebookService.updateExperiment(form.id, { title }); break;
        case 'execution': request = this.notebookService.updateExecution(form.id, { title }); break;
      }
    }

    this.pending.set(true);
    this.error.set(null);
    request.pipe(
      finalize(() => this.pending.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => { this.draft.set(null); this.changed.emit(); },
      error: (error: unknown) => this.error.set(this.errorMessage(error)),
    });
  }

  archive(kind: 'notebook' | 'experiment' | 'execution', id: string): void {
    if (this.pending()) return;
    if (!confirm(`Archiviare ${this.kindLabel(kind)}? I contenuti non saranno eliminati.`)) return;
    const request = kind === 'notebook'
      ? this.notebookService.archiveNotebook(id)
      : kind === 'experiment'
        ? this.notebookService.archiveExperiment(id)
        : this.notebookService.archiveExecution(id);
    this.pending.set(true);
    this.error.set(null);
    request.pipe(
      finalize(() => this.pending.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => this.changed.emit(),
      error: (error: unknown) => this.error.set(this.errorMessage(error)),
    });
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Operazione non riuscita. Riprova.';
  }
}
