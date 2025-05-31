import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { LabNotebookEditorComponent } from '../../../components/notebook/lab-notebook-editor/lab-notebook-editor.component';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotebookService } from '../../../services/graphql/notebook.service';
import { NotebookTree } from '../../../Models/graphql/notebook/notebook.models';
import { NotebookTocComponent } from '../../../components/notebook/notebook-tree-index/notebook-toc.component';


@Component({
  selector: 'lab-notebook-edit-component',
  standalone: true,
  imports: [LabNotebookEditorComponent, NotebookTocComponent],
  template: `
    @if (notebook() != null) {
      <app-notebook-toc
        [notebook]="notebook()"
        [mode]="'edit'"
        [selectedIds]="{
          c_id: chapterId(),
          s_id: sectionId(),
          p_id: pageId()
        }"
      />

      <div class="flex flex-col items-center w-full max-w-3xl mx-auto mt-6">
        @if (pageId() && currentPage()) {
          <lab-notebook-editor
            class="block"
            [content]="currentPage()?.content || ''"
            [triggerContentEmission]="trigger()"
            (emitContent)="saveContent($event)" />
          <button type="button"
            (click)="triggerContentEmission()"
            class="flex items-center justify-center gap-3 w-fit mt-4 py-2 px-5 text-slate-50 rounded-md transition-colors duration-150
            bg-light-accent-primary dark:bg-dark-accent-primary/90
            hover:bg-dark-accent-primary/80 dark:hover:bg-dark-accent-primary/80
            disabled:bg-dark-accent-primary/80 disabled:dark:bg-dark-accent-primary/80
            disabled:cursor-not-allowed disabled:hover:bg-dark-accent-primary/80 disabled:hover:dark-accent-primary/80">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="w-auto h-6 fill-current">
              <path d="M32 32L0 32 0 64 0 448l0 32 32 0 384 0 32 0 0-32 0-288 0-13.3-9.4-9.4-96-96L333.3 32 320 32 32 32zM64 96l256 0 0 128L64 224 64 96zM224 288a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/>
            </svg>
            <span>Salva</span>
          </button>
        } @else {
          <div class="mt-12 text-xl text-center text-slate-400 italic">
            Seleziona un <b>paragrafo</b> per modificare il contenuto.<br>
            (Ogni paragrafo è una “pagina” del quaderno/esperimento.)
          </div>
        }
      </div>
    }
  `
})
export class NotebookEditComponent implements OnInit, OnDestroy {
  private notebookSub?: Subscription;
  private querySub?: Subscription;
  trigger = signal<boolean>(false);

  notebookId = signal<string>('');
  chapterId = signal<string>('');
  sectionId = signal<string>('');
  pageId = signal<string>('');
  notebook = signal<NotebookTree | undefined>(undefined);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly notebookService: NotebookService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.notebookId.set(params['notebookId'])
      this.notebookSub = this.notebookService.getNotebookById(params['notebookId'])
        .subscribe(nb => this.notebook.set(nb))
      this.querySub = this.route.queryParams.subscribe(query => {
        console.log('CHANGED', query);
        this.chapterId.set(query['c_id'] ?? '')
        this.sectionId.set(query['s_id'] ?? '')
        this.pageId.set(query['p_id'] ?? '')
      });
    });
  }

  ngOnDestroy(): void {
    this.notebookSub?.unsubscribe()
    this.querySub?.unsubscribe()
  }

  triggerContentEmission(): void {
    this.trigger.set(true)
  }

  /**
   * Estrae la pagina corrente (paragrafo) dall’albero secondo gli id selezionati
   */
  currentPage() {
    const nb = this.notebook();
    if (!nb) return undefined;
    const c_id = this.chapterId();
    const s_id = this.sectionId();
    const p_id = this.pageId();
    if (!c_id || !s_id || !p_id) return undefined;
    const chapter = nb.chapters.find(c => c.id === c_id);
    const section = chapter?.sections.find(s => s.id === s_id);
    const page = section?.pages?.find(p => p.id === p_id);
    return page;
  }

  saveContent(content: string): void {
    this.trigger.set(false);
    const page = this.currentPage();
    if (!page) return;
    this.notebookService.updatePage(page.id, page.title, content).subscribe({
      next: () => {
        // aggiorna anche localmente? (reload notebook dopo salvataggio, per ora semplifica)
        this.notebookSub = this.notebookService.getNotebookById(this.notebookId()).subscribe(nb => this.notebook.set(nb))
      },
      error: err => alert('Errore nel salvataggio: ' + err.message)
    });
  }
}
