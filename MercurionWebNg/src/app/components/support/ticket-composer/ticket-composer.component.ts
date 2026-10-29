import { ChangeDetectionStrategy, Component, inject, input, OnChanges, OnInit, output, signal, SimpleChanges } from '@angular/core'
import { QuillModule } from 'ngx-quill'
import { FormsModule } from '@angular/forms'
import type Quill from 'quill'
import { QuillStylesService } from '../../../services/quill-styles.service'
import { JsonValue, toJsonValue } from '../../../Models/json.models'
import { ButtonComponent } from '../../common/button/button.component'

type QuillContentChange = {
  content?: unknown
  text?: unknown
}

@Component({
  selector: 'm-ticket-composer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QuillModule, FormsModule, ButtonComponent],
  styleUrl: './ticket-composer.component.css',
  template: `
    <section class="flex w-full min-w-0 flex-col gap-3 border-t border-token-border bg-surface-elevated p-3 text-on-surface-main sm:p-6" aria-labelledby="ticket-reply-label">
      <h3 id="ticket-reply-label" class="text-sm font-semibold">La tua risposta</h3>
      @if (closed()) {
        <p role="status" class="text-sm text-on-surface-secondary">Il ticket è chiuso. Non è possibile inviare messaggi; l’eventuale bozza resta visibile fino alla chiusura del pannello.</p>
      }
      <quill-editor
        class="block w-full min-w-0
          [&_.ql-toolbar]:rounded-t-lg [&_.ql-toolbar]:border-token-border [&_.ql-toolbar]:bg-surface-main
          [&_.ql-container]:h-[clamp(6rem,18dvh,12rem)] [&_.ql-container]:rounded-b-lg
          [&_.ql-container]:border-token-border [&_.ql-container]:bg-surface-main
          [&_.ql-editor]:min-h-0 [&_.ql-editor]:text-base [&_.ql-editor]:text-on-surface-main
          [&_.ql-editor.ql-blank::before]:text-on-surface-secondary
          dark:[&_.ql-toolbar_.ql-stroke]:stroke-slate-200 dark:[&_.ql-toolbar_.ql-fill]:fill-slate-200
          [&_.ql-toolbar_button:focus-visible]:outline-2 [&_.ql-toolbar_button:focus-visible]:outline-offset-2
          [&_.ql-toolbar_button:focus-visible]:outline-light-accent-primary-hq"
        [modules]="modules" [(ngModel)]="contentHtml" [readOnly]="pending() || disabled()"
        (onContentChanged)="onChanged($event)" (onEditorCreated)="configureEditor($event)"
        placeholder="Scrivi un messaggio…" />
      <p id="ticket-reply-help" class="text-xs text-on-surface-secondary">Non includere password o codici di sicurezza. La bozza viene cancellata solo dopo la conferma dell’invio o alla chiusura del pannello.</p>
      @if (error()) {
        <p role="alert" class="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">{{ error() }}</p>
      } @else if (sentRevision() > 0 && !canSend() && !pending()) {
        <p role="status" class="text-sm text-on-surface-secondary">Messaggio inviato.</p>
      }
      <div class="flex justify-end">
        <m-button [disabled]="!canSend() || disabled()" [loading]="pending()"
          ariaLabel="Invia messaggio" (pressed)="sendMsg()">{{ pending() ? 'Invio in corso…' : 'Invia messaggio' }}</m-button>
      </div>
    </section>
  `,
})
export class TicketComposerComponent implements OnInit, OnChanges {
  private readonly quillStyles = inject(QuillStylesService)
  readonly send = output<{ html: string; delta: JsonValue }>()
  readonly pending = input(false)
  readonly disabled = input(false)
  readonly closed = input(false)
  readonly error = input<string | null>(null)
  readonly sentRevision = input(0)
  readonly canSend = signal(false)
  contentHtml = ''
  private delta: JsonValue = null
  readonly modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'code-block', 'clean'],
    ],
  }

  ngOnInit(): void {
    this.quillStyles.load()
  }

  ngOnChanges(changes: SimpleChanges): void {
    const sent = changes['sentRevision']
    if (!sent || sent.firstChange || sent.currentValue === sent.previousValue) return
    this.contentHtml = ''
    this.delta = null
    this.canSend.set(false)
  }

  configureEditor(editor: Quill): void {
    editor.root.setAttribute('role', 'textbox')
    editor.root.setAttribute('aria-multiline', 'true')
    editor.root.setAttribute('aria-labelledby', 'ticket-reply-label')
    editor.root.setAttribute('aria-describedby', 'ticket-reply-help')
    const toolbar = editor.getModule('toolbar') as { container?: HTMLElement }
    const labels: Record<string, string> = {
      bold: 'Grassetto', italic: 'Corsivo', underline: 'Sottolineato', strike: 'Barrato',
      link: 'Inserisci collegamento', 'code-block': 'Blocco di codice', clean: 'Rimuovi formattazione',
    }
    toolbar.container?.setAttribute('aria-label', 'Formattazione della risposta')
    toolbar.container?.querySelectorAll('button').forEach(button => {
      const format = [...button.classList].find(value => value.startsWith('ql-'))?.slice(3) ?? ''
      const label = format === 'list'
        ? (button.value === 'ordered' ? 'Elenco numerato' : 'Elenco puntato')
        : labels[format]
      if (label) {
        button.setAttribute('aria-label', label)
        button.title = label
      }
    })
  }

  onChanged(event: QuillContentChange): void {
    this.delta = toJsonValue(event.content)
    const text = typeof event.text === 'string' ? event.text.trim() : ''
    this.canSend.set(text.length > 0 && this.delta !== null)
  }

  sendMsg(): void {
    if (!this.canSend() || this.pending() || this.disabled()) return
    this.send.emit({ html: this.contentHtml, delta: this.delta })
  }
}
