import { Component, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';

@Component({
  selector: 'lab-notebook-editor',
  standalone: true,
  imports: [QuillModule, FormsModule],
  template: `
    <div [class.dark]="darkMode">
      <quill-editor
        [modules]="modules"
        [theme]="darkMode ? 'bubble' : 'snow'"
        [style]="{height: '400px'}"
        [placeholder]="placeholder"
        [ngModel]="content()"
        (ngModelChange)="content.set($event)">
      </quill-editor>
      <button class="btn" (click)="save()">💾 Salva</button>
    </div>
  `,
  styles: [`
    .dark quill-editor,
    .dark .ql-container {
      background: #18181c !important;
      color: #ececec !important;
    }
    .btn {
      margin-top: 12px;
      background: #ffd600;
      color: #222;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
    }
  `]
})
export class LabNotebookEditorComponent {
  content = signal<string>(''); // Stato editor (puoi inizializzare con HTML o Delta!)
  darkMode = false; // Collega al tuo ThemeManager o rileva preferenze

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
  };

  save() {
    // Qui salva content() (HTML o Delta, decidi tu)
    console.log('Contenuto:', this.content());
    // ...chiamata a notebookService, emit event, ecc
  }
}
