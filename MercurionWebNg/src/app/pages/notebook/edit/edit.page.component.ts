import {
  ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, computed,
  inject, signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  BehaviorSubject, EMPTY, Observable, Subject, catchError, combineLatest,
  concatMap, debounceTime, finalize, forkJoin, map, merge, of, switchMap, tap
} from 'rxjs';
import {
  ExecutionTree, ExperimentTree, NotebookDelta, NotebookNodeKind, NotebookTree,
  SectionTree
} from '../../../Models/graphql/notebook/notebook.models';
import { NotebookService } from '../../../services/graphql/notebook.service';
import { LabNotebookEditorComponent } from '../../../components/notebook/lab-notebook-editor/lab-notebook-editor.component';
import {
  NotebookSelection, NotebookTocComponent
} from '../../../components/notebook/notebook-tree-index/notebook-toc.component';
import { routeManifest } from '../../../route-manifest';

type Mode = 'read' | 'edit';
type SaveStatus = 'saved' | 'modified' | 'saving' | 'error';
type Node = {
  kind: NotebookNodeKind;
  id: string;
  title: string;
  contentDelta: NotebookDelta | null;
  execution?: ExecutionTree;
  experiment?: ExperimentTree;
};
type SaveChange = { kind: NotebookNodeKind; id: string; delta: NotebookDelta };
type Context = {
  notebookId: string;
  mode: Mode;
  selection: NotebookSelection;
  kind: NotebookNodeKind;
  targetId: string;
};

@Component({
  selector: 'm-lab-notebook-edit-component',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LabNotebookEditorComponent, NotebookTocComponent],
  template: `
    <main role="main" class="mx-auto max-w-7xl px-4 py-5" [attr.aria-busy]="loading()">
      <header class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <a [routerLink]="['/notebook']" class="text-sm underline">Tutti i quaderni</a>
          <h1 class="mt-2 text-2xl font-semibold">{{ notebook()?.title || 'Quaderno di laboratorio' }}</h1>
        </div>
        @if (notebook(); as nb) {
          <div class="flex flex-wrap gap-2">
            <a [routerLink]="readUrl(nb.id)" [queryParams]="selection()"
              [attr.aria-current]="mode() === 'read' ? 'page' : null"
              class="rounded-md border px-3 py-1.5 text-sm">Lettura</a>
            <a [routerLink]="editUrl(nb.id)" [queryParams]="selection()"
              [attr.aria-current]="mode() === 'edit' ? 'page' : null"
              class="rounded-md border px-3 py-1.5 text-sm">Modifica</a>
          </div>
        }
      </header>

      @if (error()) {
        <div role="alert" class="mb-4 rounded-md border border-red-500 p-3">
          {{ error() }}
          <button class="ml-2 underline" type="button" (click)="reload()">Riprova</button>
        </div>
      }
      @if (loading()) {
        <p role="status">Caricamento contenuto…</p>
      } @else if (notebook(); as nb) {
        <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section aria-label="Contenuto del quaderno" class="min-w-0">
            @if (selectedNode(); as node) {
              <h2 class="mb-3 text-xl font-semibold">{{ node.title }}</h2>
              @if (node.kind === 'execution' && node.execution; as execution) {
                <div class="mb-4 flex flex-wrap items-center gap-2 text-sm">
                  <span class="rounded-md border px-2 py-1">Stato: {{ execution.status }}</span>
                  @if (execution.protocolRevision) {
                    <span class="rounded-md border px-2 py-1">
                      Protocollo v{{ execution.protocolRevision.revisionNumber }}
                    </span>
                  }
                  @if (mode() === 'edit' && canEdit() && execution.status === 'DRAFT') {
                    <button type="button" class="rounded-md border px-3 py-1"
                      [disabled]="savingOrDirty() || actionPending()"
                      (click)="changeExecutionStatus('start', execution.id)">Avvia esecuzione</button>
                  }
                  @if (mode() === 'edit' && canEdit() && execution.status === 'IN_PROGRESS') {
                    <button type="button" class="rounded-md border px-3 py-1"
                      [disabled]="savingOrDirty() || actionPending()"
                      (click)="changeExecutionStatus('complete', execution.id)">Completa</button>
                    <button type="button" class="rounded-md border px-3 py-1"
                      [disabled]="savingOrDirty() || actionPending()"
                      (click)="changeExecutionStatus('cancel', execution.id)">Annulla</button>
                  }
                </div>
              }
              @if (node.kind === 'experiment' && node.experiment?.protocolRevisions?.length) {
                <p class="mb-3 text-sm text-slate-600 dark:text-slate-300">
                  Revisioni del protocollo: {{ node.experiment?.protocolRevisions?.length }}
                </p>
              }

              <m-lab-notebook-editor [content]="node.contentDelta"
                [readOnly]="!canEdit()" [ariaLabel]="'Contenuto: ' + node.title"
                (contentChanged)="onDeltaChanged($event)" />

              @if (mode() === 'edit') {
                <div class="mt-3 flex flex-wrap items-center gap-3 text-sm" aria-live="polite">
                  @switch (saveStatus()) {
                    @case ('modified') { <span>Modifiche da salvare…</span> }
                    @case ('saving') { <span>Salvataggio in corso…</span> }
                    @case ('saved') { <span>Sincronizzato</span> }
                    @case ('error') { <span role="alert">Salvataggio non riuscito.</span> }
                  }
                  @if (saveStatus() !== 'saved') {
                    <button type="button" class="rounded-md border px-3 py-1"
                      (click)="saveNow()" [disabled]="saveStatus() === 'saving'">
                      {{ saveStatus() === 'error' ? 'Riprova' : 'Salva ora' }}
                    </button>
                  }
                </div>
              }
            } @else {
              <p role="status">Seleziona un elemento dall'indice.</p>
            }
          </section>

          <aside class="min-w-0">
            <m-notebook-toc [notebook]="nb" [mode]="mode()" [selectedIds]="selection()" />
          </aside>
        </div>
      }
    </main>
  `,
})
export class NotebookEditPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly notebookService = inject(NotebookService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly refresh$ = new BehaviorSubject<number>(0);
  private readonly changes$ = new Subject<SaveChange>();
  private readonly saveNow$ = new Subject<SaveChange>();

  readonly notebook = signal<NotebookTree | null>(null);
  readonly selectedNode = signal<Node | null>(null);
  readonly selection = signal<NotebookSelection>({});
  readonly mode = signal<Mode>('read');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly saveStatus = signal<SaveStatus>('saved');
  readonly pendingDraft = signal<SaveChange | null>(null);
  readonly actionPending = signal(false);

  readonly canEdit = computed(() => {
    const node = this.selectedNode();
    if (this.mode() !== 'edit' || !node || this.notebook()?.archivedAt) return false;
    if (node.kind === 'experiment' && node.experiment?.archivedAt) return false;
    if (node.kind === 'execution' &&
        (node.execution?.archivedAt ||
         node.execution?.status === 'COMPLETED' ||
         node.execution?.status === 'CANCELLED')) return false;
    return true;
  });
  readonly savingOrDirty = computed(() =>
    this.saveStatus() !== 'saved'
  );

  ngOnInit(): void {
    merge(this.changes$.pipe(debounceTime(800)), this.saveNow$).pipe(
      concatMap(change => {
        this.saveStatus.set('saving');
        return this.persist(change).pipe(
          map(() => ({ change, error: null as string | null })),
          catchError((error: unknown) => of({
            change,
            error: error instanceof Error ? error.message : 'Salvataggio non riuscito'
          })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ change, error }) => {
      if (error) {
        this.saveStatus.set('error');
        this.error.set(error);
      } else if (this.isSameChange(this.pendingDraft(), change)) {
        this.pendingDraft.set(null);
        this.saveStatus.set('saved');
      } else {
        this.saveStatus.set('modified');
      }
    });

    combineLatest([
      this.route.paramMap,
      this.route.queryParamMap,
      this.route.data,
      this.refresh$,
    ]).pipe(
      map(([params, query, data]): Context => {
        const notebookId = params.get('notebookId') ?? '';
        const s_id = query.get('s_id') ?? undefined;
        const e_id = query.get('e_id') ?? undefined;
        const x_id = query.get('x_id') ?? undefined;
        const kind: NotebookNodeKind = x_id ? 'execution' : e_id ? 'experiment' : s_id ? 'section' : 'notebook';
        return {
          notebookId,
          selection: { s_id, e_id, x_id },
          kind,
          targetId: x_id ?? e_id ?? s_id ?? notebookId,
          mode: data['notebookMode'] === 'edit' ? 'edit' : 'read'
        };
      }),
      tap(context => {
        // A quick selection change must not discard the preceding node's Delta.
        const pending = this.pendingDraft();
        if (pending && pending.id !== context.targetId) this.saveNow$.next(pending);
        this.mode.set(context.mode);
        this.selection.set(context.selection);
        this.loading.set(true);
        this.error.set(null);
        this.selectedNode.set(null);
      }),
      switchMap(context => {
        if (!context.notebookId) {
          return of({ notebook: null, node: null, context, error: 'ID del quaderno mancante' });
        }
        return forkJoin({
          notebook: this.notebookService.getNotebookById(context.notebookId),
          node: this.loadSelectedNode(context),
        }).pipe(
          map(({ notebook, node }) => ({
            notebook, node, context,
            error: notebook && node && this.isMemberOfNotebook(notebook, node, context.selection)
              ? null : 'Elemento del quaderno non trovato'
          })),
          catchError((error: unknown) => of({
            notebook: null, node: null, context,
            error: error instanceof Error ? error.message : 'Caricamento non riuscito'
          }))
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => {
      this.notebook.set(result.notebook);
      this.selectedNode.set(result.error ? null : result.node);
      this.error.set(result.error);
      this.loading.set(false);
      if (!this.pendingDraft()) this.saveStatus.set('saved');
    });
  }

  ngOnDestroy(): void {
    this.changes$.complete();
    this.saveNow$.complete();
    this.refresh$.complete();
  }

  readUrl(notebookId: string): string {
    return routeManifest.notebookReader.build({ notebookId });
  }
  editUrl(notebookId: string): string {
    return routeManifest.notebookEditor.build({ notebookId });
  }

  reload(): void {
    this.refresh$.next(this.refresh$.value + 1);
  }

  private loadSelectedNode(context: Context): Observable<Node | null> {
    switch (context.kind) {
      case 'notebook':
        return this.notebookService.getNotebookById(context.notebookId).pipe(
          map(nb => nb ? {
            kind: 'notebook', id: nb.id, title: nb.title,
            contentDelta: nb.premiseDelta ?? null
          } : null)
        );
      case 'section':
        return this.notebookService.getSectionById(context.targetId).pipe(
          map(section => section ? this.sectionNode(section) : null)
        );
      case 'experiment':
        return this.notebookService.getExperimentById(context.targetId).pipe(
          map(exp => exp ? {
            kind: 'experiment' as const, id: exp.id, title: exp.title,
            contentDelta: exp.contentDelta ?? null, experiment: exp
          } : null)
        );
      case 'execution':
        return this.notebookService.getExecutionById(context.targetId).pipe(
          map(run => run ? {
            kind: 'execution' as const, id: run.id, title: run.title,
            contentDelta: run.contentDelta ?? null, execution: run
          } : null)
        );
    }
  }

  private sectionNode(section: SectionTree): Node {
    return {
      kind: 'section', id: section.id, title: section.title,
      contentDelta: section.contentDelta ?? null
    };
  }

  private isMemberOfNotebook(nb: NotebookTree, node: Node, selected: NotebookSelection): boolean {
    if (node.kind === 'notebook') return nb.id === node.id;
    const section = nb.sections.find(value => value.id === selected.s_id);
    if (!section) return false;
    if (node.kind === 'section') return node.id === section.id;
    const experiment = section.experiments.find(value => value.id === selected.e_id);
    if (!experiment) return false;
    if (node.kind === 'experiment') return node.id === experiment.id;
    return experiment.executions.some(value => value.id === node.id);
  }

  onDeltaChanged(delta: NotebookDelta): void {
    const node = this.selectedNode();
    if (!node || !this.canEdit()) return;
    const change: SaveChange = { kind: node.kind, id: node.id, delta };
    this.pendingDraft.set(change);
    this.saveStatus.set('modified');
    this.changes$.next(change);
  }

  saveNow(): void {
    const change = this.pendingDraft();
    if (change) this.saveNow$.next(change);
  }

  private persist(change: SaveChange): Observable<unknown> {
    switch (change.kind) {
      case 'notebook':
        return this.notebookService.updateNotebook(change.id, { premiseDelta: change.delta });
      case 'section':
        return this.notebookService.updateSection(change.id, { contentDelta: change.delta });
      case 'experiment':
        return this.notebookService.updateExperiment(change.id, { contentDelta: change.delta });
      case 'execution':
        return this.notebookService.updateExecution(change.id, { contentDelta: change.delta });
    }
  }

  private isSameChange(a: SaveChange | null, b: SaveChange): boolean {
    return !!a && a.id === b.id && a.kind === b.kind &&
      JSON.stringify(a.delta) === JSON.stringify(b.delta);
  }

  changeExecutionStatus(action: 'start' | 'complete' | 'cancel', id: string): void {
    if (this.savingOrDirty() || this.actionPending()) return;
    const mutation = action === 'start'
      ? this.notebookService.startExecution(id)
      : action === 'complete'
        ? this.notebookService.completeExecution(id)
        : this.notebookService.cancelExecution(id);
    this.actionPending.set(true);
    mutation.pipe(
      finalize(() => this.actionPending.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => this.reload(),
      error: (error: unknown) => this.error.set(
        error instanceof Error ? error.message : 'Operazione non riuscita'
      ),
    });
  }

  /** Route guard: never silently abandon an in-flight or failed draft. */
  canDeactivate(): boolean {
    if (this.saveStatus() === 'saved') return true;
    return confirm('Ci sono modifiche non ancora salvate. Vuoi lasciare la pagina?');
  }
}
