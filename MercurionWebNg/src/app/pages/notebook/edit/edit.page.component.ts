import { AfterViewChecked, AfterViewInit, Component, ChangeDetectionStrategy, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LabNotebookEditorComponent } from '../../../components/notebook/lab-notebook-editor/lab-notebook-editor.component';
import { ActivatedRoute } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, EMPTY, map, of, Subject, switchMap, tap } from 'rxjs';
import { NotebookService } from '../../../services/graphql/notebook.service';
import { NotebookTree } from '../../../Models/graphql/notebook/notebook.models';
import { NotebookTocComponent } from '../../../components/notebook/notebook-tree-index/notebook-toc.component';


@Component({
  selector: 'm-lab-notebook-edit-component',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LabNotebookEditorComponent, NotebookTocComponent],
  template: `
    @if (notebook()) {
      <main class="flex flex-col items-center w-full mx-auto mt-1" role="main" aria-live="polite" [attr.aria-busy]="!notebook()">
        @if (pageId() && currentPage()) {
          <div class="flex flex-col-reverse lg:flex-row gap-4">
            <div class="flex flex-col items-center">
              @if (level()) {
                <h1 #h1 id="notebook-edit-heading" class="tracking-wider font-semibold text-4xl sm:text-5xl lg:text-6xl pb-3 mb-3 text-center lg:text-left">
                  {{title()}}.
                </h1>
              }
              <m-lab-notebook-editor
              class="block"
              [content]="currentPage()?.content || ''"
              [triggerContentEmission]="trigger()"
              (emitContent)="saveContent($event)"
              ariaLabel="Editor del quaderno di laboratorio"
              />

            </div>
            <m-notebook-toc class="basis-64 w-full sm:w-auto max-w-full"
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
                <h1 id="notebook-edit-heading" class="tracking-wider font-semibold text-4xl sm:text-5xl lg:text-6xl pb-3 text-center">
                  {{title()}}.
                </h1>
          }
          <div class="mt-12 text-xl text-center text-slate-400 dark:text-slate-200 italic" role="status" aria-live="polite">
            Seleziona un <b>paragrafo</b> per modificare il contenuto.<br>
            (Ogni paragrafo è una “pagina” del quaderno/esperimento.)
          </div>
          <m-notebook-toc class="block mt-4"
                [notebook]="notebook()"
                [mode]="'edit'"
                [selectedIds]="{
                  c_id: chapterId(),
                  s_id: sectionId(),
                  p_id: pageId()
                }"
            />

        }
      </main>
    }

  `
})
export class NotebookEditPageComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('h1')
  h1Ref!: ElementRef<HTMLElement>

  private autosave$ = new Subject<string>()

  protected offsetHeight = signal<number>(0)
  private readonly destroyRef = inject(DestroyRef)
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
    this.route.params.pipe(
      map(params => params['notebookId'] as string),
      tap(notebookId => this.notebookId.set(notebookId)),
      switchMap(notebookId => this.notebookService.getNotebookById(notebookId)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(nb => this.notebook.set(nb))

    this.route.queryParams.pipe(
      tap(query => {
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
      }),
      switchMap(() => {
        switch (this.level()) {
          case 'notebook':
            this.title.set(this.notebook()?.title ?? '')
            return EMPTY
          case 'chapter':
            return this.notebookService.getChapterById(this.chapterId())
          case 'section':
            return this.notebookService.getSectionById(this.sectionId())
          case 'page':
            return this.notebookService.getPageByIdHeader(this.pageId())
          default:
            return EMPTY
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(res => this.title.set(res?.title ?? ''))

    this.autosave$.pipe(
      debounceTime(800),
      distinctUntilChanged(),
      switchMap(content => {
        const page = this.currentPage()
        if (!page) return of(null)
        return this.notebookService.updatePage(page.id, page.title, content).pipe(
          catchError(err => {
            console.error('Errore nel salvataggio: ' + err.message)
            return of(null)
          })
        )
      }),
      switchMap(res => res ? this.notebookService.getNotebookById(this.notebookId()) : of(null)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(nb => {
      if (nb) this.notebook.set(nb)
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
    this.autosave$.complete()
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
    this.autosave$.next(content)
  }

}
