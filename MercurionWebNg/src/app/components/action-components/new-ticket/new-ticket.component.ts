import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { HelpService } from '../../../services/graphql/help.service';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { ToastService } from '../../../services/toast.service';
import { Subscription } from 'rxjs';
import { TicketDetailContextService } from '../../../services/context/action-context/ticket-detail-context.service';

@Component({
  selector: 'm-new-ticket',
  standalone: true,
  imports: [FormsModule, QuillModule],
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
    `,
  ],
  template: `
    <div
      class="w-full max-w-3xl mx-auto bg-white dark:bg-dark-surface-main rounded-xl shadow-lg"
    >
      <div
        class="flex items-center justify-between px-4 py-4 border-b border-slate-200/70 dark:border-slate-700/60"
      >
        <h2 class="text-lg font-semibold">Nuovo ticket di supporto</h2>
        <button
          class="size-8 text-slate-500 hover:text-emerald-600"
          (click)="close()"
        >
          ✕
        </button>
      </div>

      <div class="p-4 flex flex-col gap-4">
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium text-slate-700 dark:text-slate-200"
            >Oggetto</span
          >
          <input
            class="h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40
                   text-slate-900 dark:text-slate-50 outline-none focus:ring-2 focus:ring-light-accent-primary/40"
            [(ngModel)]="subject"
            (ngModelChange)="validate()"
            placeholder="Es. Problema con importazione molecola"
          />
        </label>

        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium text-slate-700 dark:text-slate-200"
            >Messaggio</span
          >

          <quill-editor
            class="w-full"
            [modules]="modules"
            [styles]="{ height: '220px' }"
            [(ngModel)]="contentHtml"
            (onContentChanged)="onChanged($event)"
            placeholder="Descrivi il problema in dettaglio..."
          ></quill-editor>
        </label>

        <div class="flex justify-end pt-2">
          <button
            type="button"
            class="h-10 px-5 rounded-md text-sm font-semibold text-white
                   bg-light-accent-primary dark:bg-dark-accent-primary-btn
                   hover:bg-light-accent-primary/80 dark:hover:bg-dark-accent-primary/80
                   disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            [disabled]="!canSend() || loading()"
            (click)="createTicket()"
          >
            {{ loading() ? 'Invio...' : 'Invia ticket' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class NewTicketComponent implements OnDestroy {
  private readonly helpService = inject(HelpService);
  private readonly overlayContext = inject(ActionOverlayContextService);
  private readonly detailContext = inject(TicketDetailContextService);
  private readonly toast = inject(ToastService);

  private sub?: Subscription;

  subject = ''
  contentHtml = ''
  private delta: any = null
  private lastPlainText = ''

  canSend = signal(false)
  loading = signal(false)

  modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'clean'],
    ],
  };

  ngOnDestroy(): void {
    this.sub?.unsubscribe()
  }

  onChanged(e: any) {
    this.delta = e?.delta ?? null
    this.lastPlainText = (e?.text ?? '').trim()
    this.validate()
  }

  validate() {
    const s = this.subject.trim()
    const t = this.lastPlainText
    this.canSend.set(s.length > 2 && t.length > 0)
  }

  createTicket() {
    if (!this.canSend() || this.loading()) {
      return
    }

    this.loading.set(true);

    this.sub = this.helpService
      .createTicket(this.subject, this.contentHtml, this.delta)
      .subscribe({
        next: (res) => {
          this.loading.set(false)
          const id = res?.id
          if (!id) { this.close(); return; }

          this.detailContext.setInnerScope('User')
          this.detailContext.setTicketId(id)
          this.detailContext.notifyAdded()

          this.overlayContext.open('TicketDetail')
        },
        error: () => {
          this.loading.set(false)
          this.toast.trigger('Si è verificato un errore.', 'error', 3000)
        },
      });
  }

  close() {
    this.overlayContext.close()
  }
}
