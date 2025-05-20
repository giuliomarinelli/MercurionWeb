import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { LabNotebookEditorComponent } from '../../../components/notebook/lab-notebook-editor/lab-notebook-editor.component';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'lab-notebook-edit-component',
  imports: [LabNotebookEditorComponent],
  template: `

    <div class="flex flex-col items-center">
      <lab-notebook-editor
        class="block mt-3"
        [content]="''"
        [triggerContentEmission]="trigger()"
        (emitContent)="saveContent($event)" />
        <button type="button" (click)="triggerContentEmission()"
          class="flex items-center justify-center gap-3 w-fit mt-4 py-2 px-5 text-slate-50 rounded-md transition-colors duration-150
          bg-light-accent-primary dark:bg-dark-accent-primary/90
          hover:bg-dark-accent-primary/80 dark:hover:bg-dark-accent-primary/80
          disabled:bg-dark-accent-primary/80 disabled:dark:bg-dark-accent-primary/80
            disabled:cursor-not-allowed disabled:hover:bg-dark-accent-primary/80 disabled:hover:dark:bg-dark-accent-primary/80">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="w-auto h-6 fill-current">
            <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
            <path d="M32 32L0 32 0 64 0 448l0 32 32 0 384 0 32 0 0-32 0-288 0-13.3-9.4-9.4-96-96L333.3 32 320 32 32 32zM64 96l256 0 0 128L64 224 64 96zM224 288a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/>
          </svg>
          <span>Salva</span>
        </button>
    </div>

  `
})
export class NotebookEditComponent implements OnInit, OnDestroy {

  private paramSub: Subscription | undefined
  private querySub: Subscription | undefined
  trigger = signal<boolean>(false)

  notebookId = signal<string>('')
  chapterId = signal<string>('')
  sectionId = signal<string>('')
  pageId = signal<string>('')

  constructor(
    private readonly route: ActivatedRoute
  ) { }

  ngOnInit(): void {
      this.route.params.subscribe(params => {
        // todo: valutare validazione pattern UUID
        this.notebookId.set(params['notebookId'])
        console.log(this.notebookId())
        this.querySub = this.route.queryParams.subscribe(query => {
          this.chapterId.set(query['c_id'] ?? '')
          this.sectionId.set(query['s_id'] ?? '')
          this.pageId.set(query['p_id'] ?? '')
          console.log('chapterId:', this.chapterId(), '\n\nsectionId:', this.sectionId(), '\n\npageId:', this.pageId())
        })
      })
  }

  ngOnDestroy(): void {
      this.paramSub?.unsubscribe()
      this.querySub?.unsubscribe()
  }

  triggerContentEmission(): void {
    this.trigger.set(true)
  }

  saveContent(content: string): void {
    this.trigger.set(false)
    console.log(content)
  }

}
