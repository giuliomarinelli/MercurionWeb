import { ChangeDetectionStrategy, Component, OnInit, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { NotebookDelta } from '../../../Models/graphql/notebook/notebook.models';
import { QuillStylesService } from '../../../services/quill-styles.service';

/** A full Quill Delta is the only persisted document format (not HTML). */
@Component({
  selector: 'm-lab-notebook-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, QuillModule],
  template: `
    @if (readOnly()) {
      <quill-view [content]="content()" format="object" class="block rounded-md border p-3" />
    } @else {
      <quill-editor [ngModel]="content()" [ngModelOptions]="{standalone:true}"
        format="object" theme="snow" [modules]="modules"
        [placeholder]="placeholder()" [readOnly]="false"
        [attr.aria-label]="ariaLabel()"
        (onContentChanged)="onContentChanged($event)"
        class="block min-h-72" />
    }
  `,
})
export class LabNotebookEditorComponent implements OnInit {
  private readonly quillStyles = inject(QuillStylesService);

  readonly content = input<NotebookDelta | null>(null);
  readonly readOnly = input(false);
  readonly ariaLabel = input('Editor del quaderno di laboratorio');
  readonly placeholder = input('Documenta la pianificazione o i risultati…');
  readonly contentChanged = output<NotebookDelta>();

  protected readonly modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ header: [1, 2, 3, false] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ script: 'sub' }, { script: 'super' }],
      ['link', 'image'],
      ['clean']
    ]
  };

  ngOnInit(): void {
    this.quillStyles.load();
  }

  onContentChanged(event: unknown): void {
    if (this.readOnly() || !event || typeof event !== 'object') return;
    const change = event as { source?: string; content?: unknown };
    // Programmatic updates/initialization must not generate autosave writes.
    if (change.source !== 'user') return;
    const document = change.content;
    if (document === null || typeof document !== 'object' || Array.isArray(document)
        || !('ops' in document) || !Array.isArray(document.ops)) return;
    this.contentChanged.emit(document as NotebookDelta);
  }
}
