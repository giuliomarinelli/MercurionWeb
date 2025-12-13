import { Component, EventEmitter, Output, signal } from '@angular/core';
import { QuillModule } from 'ngx-quill';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'm-ticket-composer',
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
      placeholder="Scrivi un messaggio..." />
    <button
      type="button"
      class="
        h-10 rounded-md text-sm px-4 py-2
        text-white bg-emerald-600 font-semibold shadow hover:bg-emerald-700
        disabled:bg-emerald-300 disabled:cursor-not-allowed
        disabled:opacity-60
        transition-colors
      "
      [disabled]="!canSend()"
      (click)="sendMsg()"
      title="Invia messaggio"
    >
      Invia
    </button>
  </div>
  `
})
export class TicketComposerComponent {

  @Output() send = new EventEmitter<{ html: string, delta: any }>()

  contentHtml = ''
  private delta: any = null

  canSend = signal(false)

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
