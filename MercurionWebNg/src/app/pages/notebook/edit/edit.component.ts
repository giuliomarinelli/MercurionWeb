import { AfterViewChecked, AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, effect, signal } from '@angular/core';
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
    @if (notebook()) {
      <div class="flex flex-col items-center w-full mx-auto mt-1">
        @if (pageId() && currentPage()) {
          <div class="flex flex-col-reverse lg:flex-row gap-4">
            <div class="flex flex-col items-center">
              @if (level()) {
                <h1 #h1 class="tracking-wider font-semibold text-6xl pb-3 mb-3">
                  {{title()}}.
                </h1>
              }
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
            </div>
            <app-notebook-toc class="basis-64"
                [style.paddingTop.px]="offsetHeight()"
                [notebook]="notebook()"
                [mode]="'edit'"
                [selectedIds]="{
                  c_id: chapterId(),
                  s_id: sectionId(),
                  p_id: pageId()
                }"
            />
          </div>


        } @else {
          @if (level()) {
                <h1 class="tracking-wider font-semibold text-6xl pb-3 text-center">
                  {{title()}}.
                </h1>
          }
          <div class="mt-12 text-xl text-center text-slate-400 italic">
            Seleziona un <b>paragrafo</b> per modificare il contenuto.<br>
            (Ogni paragrafo è una “pagina” del quaderno/esperimento.)
          </div>
          <app-notebook-toc class="block mt-4"
                [notebook]="notebook()"
                [mode]="'edit'"
                [selectedIds]="{
                  c_id: chapterId(),
                  s_id: sectionId(),
                  p_id: pageId()
                }"
            />

        }
      </div>
    }

  `
})
export class NotebookEditComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('h1')
  h1Ref!: ElementRef<HTMLElement>

  protected offsetHeight = signal<number>(0)
  private notebookSub?: Subscription
  private querySub?: Subscription
  private chapterSub?: Subscription
  private sectionSub?: Subscription
  private pageSub?: Subscription
  protected title = signal<string>('')
  protected level = signal<'notebook' | 'chapter' | 'section' | 'page' | undefined>(undefined)
  trigger = signal<boolean>(false)
  notebookId = signal<string>('')
  chapterId = signal<string>('')
  sectionId = signal<string>('')
  pageId = signal<string>('')
  notebook = signal<NotebookTree | undefined>(undefined)

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
        this.chapterId.set(query['c_id'] ?? '')
        this.sectionId.set(query['s_id'] ?? '')
        this.pageId.set(query['p_id'] ?? '')
        if (this.pageId()) {
          this.level.set('page')
        } else if (this.chapterId()) {
          this.level.set('chapter')
        } else if (this.sectionId()) {
          this.level.set('section')
        } else if (this.notebookId()) {
          this.level.set('notebook')
        }
        switch (this.level()) {
          case 'notebook':
            this.title.set(this.notebook()?.title ?? '')
            break
          case 'chapter':
            this.chapterSub = this.notebookService.getChapterById(this.chapterId())
              .subscribe(res => this.title.set(res?.title ?? ''))
            break
          case 'section':
            this.chapterSub = this.notebookService.getSectionById(this.sectionId())
              .subscribe(res => this.title.set(res?.title ?? ''))
            break
          case 'page':
            this.chapterSub = this.notebookService.getPageByIdHeader(this.pageId())
              .subscribe(res => this.title.set(res?.title ?? ''))
        }
      })
    })
  }

  ngAfterViewChecked(): void {

    // Quando finalmente l'h1 compare, aggiorna il padding!
    if (this.h1Ref?.nativeElement) {
      const height = this.h1Ref.nativeElement.clientHeight;
      if (this.offsetHeight() !== height) {
        this.offsetHeight.set(height + 12);
        console.log('offsetHeight aggiornato a', height);
      }

    }
  }

  ngOnDestroy(): void {
    this.notebookSub?.unsubscribe()
    this.querySub?.unsubscribe()
    this.chapterSub?.unsubscribe()
    this.sectionSub?.unsubscribe()
    this.pageSub?.unsubscribe()
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
    const page = this.currentPage()
    if (!page) return
    this.notebookService.updatePage(page.id, page.title, content).subscribe({
      next: (res) => {
        console.log(res)
        // aggiorna anche localmente? (reload notebook dopo salvataggio, per ora semplifica)
        this.notebookSub = this.notebookService.getNotebookById(this.notebookId()).subscribe(nb => this.notebook.set(nb))
      },
      error: err => alert('Errore nel salvataggio: ' + err.message)
    });
  }
}
