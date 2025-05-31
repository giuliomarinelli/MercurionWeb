import { Component, signal, effect, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { NotebookTocComponent } from '../notebook-tree-index/notebook-toc.component';

@Component({
  selector: 'lab-notebook-editor',
  standalone: true,
  imports: [QuillModule, FormsModule],
  template: `

    <quill-editor
      [modules]="modules"
      [theme]="'snow'"
      [style]="{height: '400px'}"
      [placeholder]="placeholder"
      [ngModel]="_content()"
      (ngModelChange)="_content.set($event)">
    </quill-editor>
  `,
  styles: [`
    .dark quill-editor,
    .dark .ql-container {
      background: oklch(20.5% 0 0) !important;
      color: yellow !important;
    }
  `]
})
export class LabNotebookEditorComponent {

  @Input()
  set triggerContentEmission(trigger: boolean) {
    trigger && this._triggerContentEmission.set(true)
  }

  @Input()
  set content(content: string) {
    this._content.set(content)
  }

  @Output()
  emitContent = new EventEmitter<string>()

  private _triggerContentEmission = signal<boolean>(false)
  protected _content = signal<string>('')


  placeholder = 'Scrivi qui la tua nota di laboratorio...';

  modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'header': 1 }, { 'header': 2 }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'script': 'sub' }, { 'script': 'super' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['clean']
    ]
  }

  constructor() {
    effect(() => {
      if (this._triggerContentEmission()) {
        this.emitContent.emit(this._content())
        this._triggerContentEmission.set(false)
      }
    })
  }

}
