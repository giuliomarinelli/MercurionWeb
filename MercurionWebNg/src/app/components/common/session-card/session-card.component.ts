import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Helpers } from '../../../helpers'
import { SessionDTOExt } from '../../../Models/account/account.models';

@Component({
  selector: 'm-session-card',
  imports: [DatePipe],
  template: `

    <div
      class="
        w-full rounded-md border p-4 mb-3
        bg-slate-100 dark:bg-slate-800
        border-slate-300 dark:border-slate-600
        transition-all max-h-fit duration-150 ease-linear
        opacity-100
      "
      [class.bg-emerald-100]="session.current"
      [class.dark:bg-emerald-900]="session.current"
      [class.border-emerald-400]="session.current"
      [class.max-h-0]="session.triggerDisappear()"
      [class.opacity-0]="session.triggerDisappear()"
    >

      <!-- header -->
      <div class="flex items-center justify-between mb-2">
        <div class="flex flex-col">
          <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Sessione {{ session.current ? '(attuale)' : '' }}
          </span>
          <button
            class="text-[0.70rem] text-slate-500 dark:text-slate-400 cursor-default select-all break-words"
            [attr.title]="'ID: ' + session.id">
            ID: {{ breakHex(session.id) }}
          </button>
        </div>
      </div>

      <!-- BODY -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-4">

        <div>
          <span class="text-slate-500 dark:text-slate-400 block text-xs uppercase mb-1">Creato</span>
          <span class="text-slate-700 dark:text-slate-200">
            {{ session.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}
          </span>
        </div>

        <div>
          <span class="text-slate-500 dark:text-slate-400 block text-xs uppercase mb-1">Ultimo accesso</span>
          <span class="text-slate-700 dark:text-slate-200">
            {{ session.lastAccessedAt | date:'dd/MM/yyyy HH:mm:ss' }}
          </span>
        </div>

        <div>
          <span class="text-slate-500 dark:text-slate-400 block text-xs uppercase mb-1">Provider di autenticazione</span>
          <span class="text-slate-700 dark:text-slate-200">
            {{ session.provider }}
          </span>
        </div>

        <div>
          <span class="text-slate-500 dark:text-slate-400 block text-xs uppercase mb-1">Provider di autorizzazione</span>
          <span class="text-slate-700 dark:text-slate-200">
            Mercurion
          </span>
        </div>

        <div>
          <span class="text-slate-500 dark:text-slate-400 block text-xs uppercase mb-1">Scadenza</span>
          <span class="text-slate-700 dark:text-slate-200">
            {{ session.expiresAt | date:'dd/MM/yyyy HH:mm:ss' }}
          </span>
        </div>

        <div>
          <span class="text-slate-500 dark:text-slate-400 block text-xs uppercase mb-1">Valida</span>
          <span
            class="px-2 py-[2px] rounded text-xs font-semibold"
            [class.bg-emerald-200]="session.valid"
            [class.text-emerald-800]="session.valid"
            [class.bg-rose-200]="!session.valid"
            [class.text-rose-800]="!session.valid"
          >
            {{ session.valid ? 'Sì' : 'No' }}
          </span>
        </div>

        <div>
          <span class="text-slate-500 dark:text-slate-400 block text-xs uppercase mb-1">Luogo</span>
          <span class="text-slate-700 dark:text-slate-200">
            {{ session.location }}
          </span>
        </div>

        <div>
          <span class="text-slate-500 dark:text-slate-400 block text-xs uppercase mb-1">Browser</span>
          <span class="text-slate-700 dark:text-slate-200">
            {{ session.browser }}
          </span>
        </div>

      </div>

      <!-- FOOTER Buttons -->
      <div class="flex justify-end">
        <button
          type="button"
          class="
            flex items-center gap-2 px-3 py-1 rounded-md
            border border-slate-300 dark:border-slate-600
            text-slate-600 dark:text-slate-300 text-xs font-medium
            hover:bg-slate-200 dark:hover:bg-slate-700
            transition-colors duration-150
          "
          (click)="logoutFromSession(session.id)"
          [disabled]="session.current === false ? false : false"
        >
          <svg xmlns="http://www.w3.org/2000/svg"
               viewBox="0 0 512 512"
               class="fill-current h-4 w-4 relative -left-1">
            <path d="M497 273L329 441c-9 9-24 9-33 0s-9-24 0-33l139-139H168c-13 0-24-11-24-24s11-24 24-24h267L296 104c-9-9-9-24 0-33s24-9 33 0l168 168c9 9 9 24 0 33z"/>
          </svg>
          <span>Esci da questa sessione</span>
        </button>
      </div>

    </div>


  `
})
export class SessionCardComponent {

  @Input({ required: true })
  session!: SessionDTOExt

  @Output()
  onLoggingOutFromSession = new EventEmitter<string>()

  logoutFromSession(sid: string): void {
    this.onLoggingOutFromSession.emit(sid)
  }

  breakHex(str: string): string {
    return Helpers.breakHex(str)
  }

}
