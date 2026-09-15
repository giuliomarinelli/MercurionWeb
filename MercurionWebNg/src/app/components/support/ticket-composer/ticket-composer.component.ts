import { Component, ChangeDetectionStrategy, signal, output, OnInit, inject, input } from '@angular/core';
import { QuillModule } from 'ngx-quill';
import { FormsModule } from '@angular/forms';
import { QuillStylesService } from '../../../services/quill-styles.service';

@Component({
  selector: 'm-ticket-composer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    QuillModule,
    FormsModule
  ],
  template: `
  <div class="
      border-t border-slate-200/70 dark:border-slate-700/60
      bg-white dark:bg-dark-surface-main
      px-3 sm:px-4 py-3
      flex flex-col gap-y-3 w-full items-center
    ">

    <quill-editor
      class="flex-1 w-full"
      [styles]="{height: '110px'}"
      [modules]="modules"
      [(ngModel)]="contentHtml"
      (onContentChanged)="onChanged($event)"
      placeholder="Scrivi un messaggio..."
      aria-label="Componi messaggio"
      aria-live="polite" />
    <button
      type="button"
      class="
        h-10 rounded-md text-sm px-4 py-2
        text-white bg-light-accent-primary-hq font-semibold shadow hover:bg-light-accent-primary-hc
        disabled:bg-light-accent-primary-hq/60 disabled:cursor-not-allowed
        disabled:opacity-60
        transition-colors focus:outline-none focus:ring-2 focus:ring-light-accent-primary-hq focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-surface-main
      "
      [disabled]="!canSend() || pending()"
      (click)="sendMsg()"
      title="Invia messaggio"
      [attr.aria-disabled]="!canSend() || pending()"
      aria-label="Invia messaggio"
    >
      Invia
    </button>
    @if (pending()) {
      <button type="button" class="text-xs underline" (click)="cancel.emit()">Annulla invio</button>
    }
    @if (error()) {
      <div role="alert" class="flex gap-2 text-xs text-red-700 dark:text-red-300">
        <span>{{ error() }}</span>
        <button type="button" class="underline" (click)="retry.emit()">Riprova</button>
      </div>
    }
  </div>
  `
})
export class TicketComposerComponent implements OnInit {

  private readonly quillStyles = inject(QuillStylesService)

  readonly send = output<{
    html: string;
    delta: any;
  }>();
  readonly cancel = output<void>();
  readonly retry = output<void>();
  readonly pending = input(false);
  readonly error = input<string | null>(null);

  contentHtml = ''
  private delta: any = null

  canSend = signal<boolean>(false)

  ngOnInit(): void {
    this.quillStyles.load()
  }

  modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'code-block', 'clean']
    ]
  }

  onChanged(e: any) {
    this.delta = e?.delta ?? null
    const text = (e?.text ?? '').trim()
    this.canSend.set(text.length > 0)
  }

  sendMsg() {
    if (!this.canSend()) {
      return
    }
    this.send.emit({ html: this.contentHtml, delta: this.delta })
    this.contentHtml = ''
    this.delta = null
    this.canSend.set(false)
  }
}
