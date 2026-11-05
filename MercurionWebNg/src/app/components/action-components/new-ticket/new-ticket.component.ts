import { ChangeDetectionStrategy, Component, inject, OnInit, signal, DestroyRef } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { QuillModule } from 'ngx-quill'
import type Quill from 'quill'
import { HelpService } from '../../../services/graphql/help.service'
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service'
import { DomainInvalidationService } from '../../../services/domain-invalidation.service'
import { QuillStylesService } from '../../../services/quill-styles.service'
import { JsonValue, toJsonValue } from '../../../Models/json.models'
import { ActionCardComponent } from '../../common/action-card/action-card.component'
import { ActionFooterComponent } from '../../common/action-footer/action-footer.component'
import { ButtonComponent } from '../../common/button/button.component'

type QuillContentChange = {
  content?: unknown
  text?: unknown
}

@Component({
  selector: 'm-new-ticket',
  imports: [FormsModule, QuillModule, ActionCardComponent, ActionFooterComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      :host ::ng-deep .ql-toolbar.ql-snow,
      :host ::ng-deep .ql-container.ql-snow {
        border: 1px solid rgb(203 213 225 / 0.7);
        border-radius: 0.75rem;
        background: white;
      }
      :host-context(.dark) ::ng-deep .ql-toolbar.ql-snow,
      :host-context(.dark) ::ng-deep .ql-container.ql-snow {
        border-color: rgb(51 65 85 / 0.8);
        background: #1f2937;
      }
      :host ::ng-deep .ql-editor {
        min-height: 180px;
        font-size: 0.95rem;
      }
      :host-context(.dark) ::ng-deep .ql-editor {
        color: rgb(226 232 240);
      }
      :host-context(.dark) ::ng-deep .ql-editor.ql-blank::before {
        color: rgb(148 163 184);
      }
      :host ::ng-deep .ql-toolbar.ql-snow {
        border-radius: 0.75rem 0.75rem 0 0;
      }
      :host ::ng-deep .ql-container.ql-snow {
        border-top: 0;
        border-radius: 0 0 0.75rem 0.75rem;
      }
      :host-context(.dark) ::ng-deep .ql-toolbar .ql-stroke {
        stroke: rgb(226 232 240);
      }
      :host-context(.dark) ::ng-deep .ql-toolbar .ql-fill {
        fill: rgb(226 232 240);
      }
      :host ::ng-deep .ql-toolbar button:focus-visible {
        outline: 2px solid var(--m-color-accent-primary);
        outline-offset: 2px;
      }
    `,
  ],
  template: `
    <div class="m-overlay-screen flex items-start justify-center px-2 sm:px-4 md:items-center">
      <form class="w-full max-w-3xl" (ngSubmit)="createTicket()" novalidate>
        <m-action-card size="wide" labelledBy="newTicketHeading" [busy]="loading()"
          closeLabel="Chiudi pannello nuovo ticket" [closeDisabled]="loading()" (closed)="close()">
          <h2 action-card-title id="newTicketHeading" class="text-lg font-semibold">Nuovo ticket di supporto</h2>
          <div action-card-body class="flex flex-col gap-5 p-3 sm:p-6">
            <p class="m-0 text-sm text-on-surface-secondary in-[.m-dialog--compact]:hidden">
              Indica un oggetto e descrivi la richiesta. Potrai seguire la conversazione da Supporto.
            </p>
            <div class="flex flex-col gap-2">
              <label for="new-ticket-subject" class="text-sm font-semibold">Oggetto *</label>
              <input id="new-ticket-subject" name="subject" cdkFocusInitial
                class="min-h-11 w-full min-w-0 rounded-lg border border-token-border bg-surface-main px-3 py-2 text-on-surface-main outline-none focus-visible:ring-2 focus-visible:ring-light-accent-primary-hq disabled:opacity-70"
                [(ngModel)]="subject" (ngModelChange)="validate()" (blur)="subjectTouched.set(true)"
                [disabled]="loading()" placeholder="Es. Problema con l’importazione di una molecola"
                required aria-describedby="new-ticket-subject-help" [attr.aria-invalid]="subjectTouched() && subject.trim().length < 3" />
              <p id="new-ticket-subject-help" class="m-0 text-xs" [class.text-red-700]="subjectTouched() && subject.trim().length < 3"
                [class.dark:text-red-300]="subjectTouched() && subject.trim().length < 3">
                Inserisci almeno 3 caratteri per riconoscere la richiesta.
              </p>
            </div>
            <div class="flex flex-col gap-2">
              <span id="new-ticket-message-label" class="text-sm font-semibold">Messaggio *</span>
              <quill-editor class="block w-full min-w-0 [&_.ql-container]:h-[clamp(8rem,30dvh,16rem)] [&_.ql-editor]:min-h-0"
                name="message" [modules]="modules" [(ngModel)]="contentHtml" [readOnly]="loading()"
                (onContentChanged)="onChanged($event)" (onEditorCreated)="configureEditor($event)"
                placeholder="Descrivi il problema e i passaggi per riprodurlo…" />
              <p id="new-ticket-message-help" class="m-0 text-xs text-on-surface-secondary">
                Inserisci un messaggio di testo. Non includere password o codici di sicurezza.
              </p>
            </div>
            @if (submissionError()) {
              <p role="alert" class="m-0 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
                {{ submissionError() }}
              </p>
            }
          </div>
          <m-action-footer action-card-footer>
            <m-button action-footer-secondary variant="outline" [disabled]="loading()" (pressed)="close()">Annulla</m-button>
            <m-button action-footer-primary type="submit" [disabled]="!canSend()" [loading]="loading()"
              ariaLabel="Invia ticket di supporto">{{ loading() ? 'Invio in corso…' : 'Invia ticket' }}</m-button>
          </m-action-footer>
        </m-action-card>
      </form>
    </div>
  `,
})
export class NewTicketComponent implements OnInit {
  private readonly quillStyles = inject(QuillStylesService)
  private readonly helpService = inject(HelpService)
  private readonly overlayContext = inject(ActionOverlayContextService)
  private readonly sessionId = this.overlayContext.session('NewTicket')?.id ?? -1
  private readonly invalidation = inject(DomainInvalidationService)
  private readonly destroyRef = inject(DestroyRef)

  subject = ''
  contentHtml = ''
  private delta: JsonValue = null
  private lastPlainText = ''
  readonly subjectTouched = signal(false)
  readonly canSend = signal(false)
  readonly loading = signal(false)
  readonly submissionError = signal('')
  readonly modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'clean'],
    ],
  }

  ngOnInit(): void {
    this.quillStyles.load()
  }

  configureEditor(editor: Quill): void {
    editor.root.setAttribute('role', 'textbox')
    editor.root.setAttribute('aria-multiline', 'true')
    editor.root.setAttribute('aria-required', 'true')
    editor.root.setAttribute('aria-labelledby', 'new-ticket-message-label')
    editor.root.setAttribute('aria-describedby', 'new-ticket-message-help')
    const toolbar = editor.getModule('toolbar') as { container?: HTMLElement }
    const labels: Record<string, string> = {
      bold: 'Grassetto', italic: 'Corsivo', underline: 'Sottolineato', strike: 'Barrato',
      link: 'Inserisci collegamento', clean: 'Rimuovi formattazione',
    }
    toolbar.container?.setAttribute('aria-label', 'Formattazione del messaggio')
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
    this.lastPlainText = typeof event.text === 'string' ? event.text.trim() : ''
    this.validate()
  }

  validate(): void {
    this.canSend.set(this.subject.trim().length >= 3 && this.lastPlainText.length > 0 && this.delta !== null)
  }

  private isCurrent(): boolean {
    return this.overlayContext.isOpened() && this.overlayContext.session('NewTicket')?.id === this.sessionId
  }

  createTicket(): void {
    this.subjectTouched.set(true)
    this.validate()
    if (!this.canSend() || this.loading() || !this.isCurrent()) return
    this.loading.set(true)
    this.submissionError.set('')
    this.overlayContext.beginSubmit(this.sessionId)
    this.helpService.createTicket(this.subject.trim(), this.contentHtml, this.delta)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          if (!this.isCurrent()) return
          if (!result?.id) {
            this.failSubmission()
            return
          }
          this.loading.set(false)
          this.overlayContext.submitSucceeded(this.sessionId)
          this.invalidation.publish({ domain: 'ticket', action: 'changed', ticketId: result.id, scope: 'User' })
          this.overlayContext.open('TicketDetail', { ticketId: result.id, innerScope: 'User' })
        },
        error: () => {
          if (this.isCurrent()) this.failSubmission()
        },
      })
  }

  private failSubmission(): void {
    this.loading.set(false)
    this.overlayContext.submitFailed(this.sessionId)
    this.submissionError.set('Invio non confermato. Il testo è rimasto qui: controlla l’elenco prima di riprovare, per evitare di aprire due ticket.')
  }

  close(): void {
    if (!this.loading()) this.overlayContext.close(this.sessionId)
  }
}
