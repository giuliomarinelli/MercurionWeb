import {
  Component, Input, Output, EventEmitter, signal, computed, effect
} from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { APIClientTicket, Ticket, TicketCardMode } from '../../../Models/graphql/help.models'; // path tuo
import { ThemeManagerService } from '../../../services/context/theme-manager.service';
import { inject } from '@angular/core';
import { TypeGuardsService } from '../../../services/type-guards.service';
import { Maybe } from 'graphql/jsutils/Maybe';



@Component({
  selector: 'm-ticket-card',
  imports: [DatePipe, NgClass],
  template: `
  @if (_ticket()) {
    <div class="relative" (click)="openDetail()">
      <div
        class="
          relative
          grid grid-cols-1 md:grid-cols-12 items-center gap-3 md:gap-4
          rounded-2xl border p-4 md:p-5
          bg-slate-100 dark:bg-slate-800/50 backdrop-blur-sm
          border-slate-200/70 dark:border-slate-700/60
          transition-all duration-300 overflow-hidden
          hover:shadow-md hover:-translate-y-0.5
          hover:border-indigo-300/50 dark:hover:border-indigo-400/30
          focus-within:ring-2 focus-within:ring-indigo-500/70
        "
        [ngClass]="{
          'bg-slate-100/50 dark:bg-slate-800/40': _i() % 2 !== 0,
          'fade-out': _triggerDisappear(),
          'collapse': _collapse()
        }"
        aria-label="Ticket {{ _ticket()!.publicId }}"
        role="article"
        aria-live="polite"
      >
        <!-- overlay clickabile -->
        <button
          type="button"
          class="absolute inset-0 rounded-2xl"
          [class.z-10]="true"
          [class.hidden]="_triggerDisappear()"
          (click)="onOpenDetail.emit(_ticket()!.id)"
          aria-label="Apri ticket"
        ></button>


        <!-- COLONNA SINISTRA -->
        <div class="md:col-span-9 min-w-0 relative z-20 pointer-events-none">
          <div class="flex items-center gap-3">
            <!-- publicId -->
            <span
              class="text-xs md:text-sm font-medium
                     text-slate-700 dark:text-slate-200
                     bg-slate-200/70 dark:bg-slate-700/60
                     border border-slate-300 dark:border-slate-600/60
                     px-2 py-0.5 rounded-full shrink-0"
              >
              #{{ readablePublicId() }}
            </span>

            <!-- status badge -->
            <span
              class="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 border"
              [ngClass]="statusBadgeClass()"
            >
              {{ statusLabel() }}
            </span>
          </div>

          <!-- subject -->
          <div
            class="mt-2 text-base md:text-lg font-semibold
                   text-slate-800 dark:text-slate-100 truncate"
            title="{{ _ticket()!.subject }}"
          >
            {{ _ticket()!.subject }}
          </div>

          <!-- preview / meta line -->
          <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current size-3.5 inline-block relative -top-px ">
              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path d="M320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64zM296 184L296 332.8L306.7 339.9L402.7 403.9L422.7 417.2L449.3 377.3C446.9 375.7 411.8 352.3 344 307.1L344 159.9L296 159.9L296 183.9z"/>
            </svg>
            <span>
              {{ _ticket()!.lastMessageAt | date:'dd/MM/yyyy HH:mm:ss' }}
            </span>

            <span class="text-slate-300 dark:text-slate-600">•</span>


            <svg
              class="size-3.5 relative -top-px"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
              >
              <path
              d="M6 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v1H3V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1z"
              />
              <path d="M3 8h14v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
            </svg>
            {{ _ticket()!.createdAt | date:'dd/MM/yyyy HH:mm' }}


            @if (mode() === 'support' && typeGuards.isTicket(_ticket())) {
              <span class="text-slate-300 dark:text-slate-600">•</span>
              <span class="truncate">
                Utente: {{ getUserFullNameIfIsTicket(this._ticket()) }}
              </span>
            }
          </div>
        </div>

        <!-- COLONNA DESTRA -->
        <div
          class="md:col-span-3 flex flex-wrap justify-start md:justify-end items-center gap-2 relative z-30 pointer-events-auto w-full"
        >
          @if (showCloseButton()) {
            <button
              type="button"
              class="
                flex items-center gap-2 px-3 py-1.5 rounded-md border
                text-xs font-medium transition-colors duration-150
                border-slate-400 dark:border-slate-500
                text-slate-700 dark:text-slate-200
                hover:bg-slate-200 dark:hover:bg-slate-700
              "
              (click)="$event.stopPropagation(); close.emit(_ticket()!.id)"
              title="Chiudi ticket"
              [attr.aria-label]="'Chiudi ticket ' + _ticket()!.publicId"
            >
              Chiudi
            </button>
          }

          @if (showReopenButton()) {
            <button
              type="button"
              class="
                flex items-center gap-2 px-3 py-1.5 rounded-md border
                text-xs font-medium transition-colors duration-150
                border-light-accent-primary-hq dark:border-indigo-400/60
                text-light-accent-primary-hq dark:text-indigo-200
                hover:bg-light-accent-primary-hc/20 dark:hover:bg-indigo-900/20
              "
              (click)="$event.stopPropagation(); reopen.emit(_ticket()!.id)"
              title="Riapri ticket"
              [attr.aria-label]="'Riapri ticket ' + _ticket()!.publicId"
            >
              Riapri
            </button>
          }
        </div>
      </div>
    </div>
  }
  `
})
export class TicketCardComponent {

  private readonly themeManager = inject(ThemeManagerService)
  protected readonly typeGuards = inject(TypeGuardsService)

  /* inputs --------------------------- */
  @Input({ required: true })
  set ticket(t: Ticket | APIClientTicket) {
    this._ticket.set(t)
  }

  @Input()
  set i(i: number) {
    this._i.set(i)
  }

  /** user | support (default user) */
  @Input()
  set cardMode(m: TicketCardMode) {
    this.mode.set(m)
  }

  @Input()
  set triggerDisappear(v: boolean) {
    this._triggerDisappear.set(v)
  }

  @Input()
  set collapse(v: boolean) {
    this._collapse.set(v)
  }

  /** abilita/disabilita i bottoni (default true) */
  @Input()
  set allowActions(v: boolean) {
    this._allowActions.set(v)
  }

  /* outputs -------------------------- */



  @Output()
  close = new EventEmitter<string>()

  @Output()
  reopen = new EventEmitter<string>()

  @Output()
  onOpenDetail = new EventEmitter<string>()

  /* state ---------------------------- */
  _ticket = signal<Ticket | APIClientTicket | undefined>(undefined)
  _i = signal<number>(0)
  mode = signal<TicketCardMode>('user')
  _triggerDisappear = signal<boolean>(false)
  _collapse = signal<boolean>(false)
  _allowActions = signal<boolean>(true)
  isDarkMode = signal<boolean>(false)

  constructor() {
    effect(() => this.isDarkMode.set(this.themeManager.theme() === 'dark'))
  }

  /* computed ------------------------- */

  readablePublicId = computed(() => {
    const t = this._ticket()
    if (!t) {
      return ''
    }
    const pid = (t as any).publicId ?? ''
    return pid ? String(pid) : String(t.id).slice(0, 8)
  })

  statusLabel = computed(() => {
    const s = this._ticket()?.status
    switch (s) {
      case 'Open': return 'Aperto'
      case 'WaitingSupport': return 'In attesa supporto'
      case 'WaitingUser': return 'In attesa utente'
      case 'Closed': return 'Chiuso'
      default: return String(s ?? '')
    }
  });

  statusBadgeClass = computed(() => {
    const s = this._ticket()?.status
    // palette leggibile anche su dark
    switch (s) {
      case 'Open':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200/70 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-700/40'
      case 'WaitingSupport':
        return 'bg-amber-50 text-amber-800 border-amber-200/70 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-700/40'
      case 'WaitingUser':
        return 'bg-sky-50 text-sky-800 border-sky-200/70 dark:bg-sky-900/20 dark:text-sky-200 dark:border-sky-700/40'
      case 'Closed':
        return 'bg-slate-200 text-slate-800 border-slate-300/70 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600/60'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200/70 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700/60'
    }
  })

  showCloseButton = computed(() => {
    const t = this._ticket();
    if (!t || !this._allowActions()) {
      return false
    }
    return t.status !== 'Closed'
  })

  showReopenButton = computed(() => {
    const t = this._ticket();
    if (!t || !this._allowActions() || this.mode() !== 'support') {
      return false
    }
    return t.status === 'Closed'
  })

  getUserFullNameIfIsTicket(t: Maybe<Ticket | APIClientTicket>): string {
    if (this.typeGuards.isTicket(t)) {
      return t.userFullName
    }
    return ''
  }

  openDetail(): void {
    const id = this._ticket()?.id ?? ''
    if (!id) {
      return
    }
    this.onOpenDetail.emit(id)
  }

}
