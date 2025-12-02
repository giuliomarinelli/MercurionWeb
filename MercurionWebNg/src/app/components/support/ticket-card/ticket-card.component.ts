import {
  Component, Input, Output, EventEmitter, signal, computed, effect
} from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { Ticket } from '../../../Models/graphql/help.models'; // path tuo
import { ThemeManagerService } from '../../../services/context/theme-manager.service';
import { inject } from '@angular/core';

type TicketCardMode = 'user' | 'support';

@Component({
  selector: 'm-ticket-card',
  standalone: true,
  imports: [DatePipe, NgClass],
  template: `
  @if (_ticket()) {
    <div class="relative">
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
        aria-label="Ticket {{ _ticket()!.publicId ?? _ticket()!.id }}"
      >
        <!-- overlay clickabile -->
        <button
          type="button"
          class="absolute inset-0 rounded-2xl"
          [class.z-10]="true"
          [class.hidden]="_triggerDisappear()"
          (click)="open.emit(_ticket()!.id)"
          aria-label="Apri ticket"
        ></button>

        <!-- COLONNA SINISTRA -->
        <div class="md:col-span-9 min-w-0 relative z-20 pointer-events-none">
          <div class="flex items-center gap-3">
            <!-- publicId -->
            <span
              class="text-xs md:text-sm font-medium
                     text-slate-600 dark:text-slate-300
                     bg-slate-200/70 dark:bg-slate-700/60
                     border border-slate-300/60 dark:border-slate-600/60
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
          <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Ultimo messaggio:
              {{ _ticket()!.lastMessageAt | date:'medium' }}
            </span>

            <span class="text-slate-300 dark:text-slate-600">•</span>

            <span>
              Creato:
              {{ _ticket()!.createdAt | date:'mediumDate' }}
            </span>

            @if (mode() === 'support') {
              <span class="text-slate-300 dark:text-slate-600">•</span>
              <span class="truncate">
                User: {{ _ticket()!.userId }}
              </span>
            }
          </div>
        </div>

        <!-- COLONNA DESTRA -->
        <div
          class="md:col-span-3 flex md:justify-end items-center gap-2 relative z-30 pointer-events-auto"
        >
          @if (showCloseButton()) {
            <button
              type="button"
              class="
                flex items-center gap-2 px-3 py-1.5 rounded-md border
                text-xs font-medium transition-colors duration-150
                border-slate-300 dark:border-slate-600
                text-slate-700 dark:text-slate-200
                hover:bg-slate-200 dark:hover:bg-slate-700
              "
              (click)="close.emit(_ticket()!.id)"
              title="Chiudi ticket"
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
                border-indigo-300/70 dark:border-indigo-400/60
                text-indigo-700 dark:text-indigo-200
                hover:bg-indigo-50 dark:hover:bg-indigo-900/20
              "
              (click)="reopen.emit(_ticket()!.id)"
              title="Riapri ticket"
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

  private readonly themeManager = inject(ThemeManagerService);

  /* inputs --------------------------- */
  @Input({ required: true })
  set ticket(t: Ticket) { this._ticket.set(t); }

  @Input()
  set i(i: number) { this._i.set(i); }

  /** user | support (default user) */
  @Input()
  set cardMode(m: TicketCardMode) { this.mode.set(m); }

  @Input()
  set triggerDisappear(v: boolean) { this._triggerDisappear.set(v); }

  @Input()
  set collapse(v: boolean) { this._collapse.set(v); }

  /** abilita/disabilita i bottoni (default true) */
  @Input()
  set allowActions(v: boolean) { this._allowActions.set(v); }

  /* outputs -------------------------- */
  @Output() open = new EventEmitter<string>();
  @Output() close = new EventEmitter<string>();
  @Output() reopen = new EventEmitter<string>();

  /* state ---------------------------- */
  _ticket = signal<Ticket | undefined>(undefined);
  _i = signal<number>(0);
  mode = signal<TicketCardMode>('user');
  _triggerDisappear = signal<boolean>(false);
  _collapse = signal<boolean>(false);
  _allowActions = signal<boolean>(true);

  isDarkMode = signal<boolean>(false);

  constructor() {
    effect(() => this.isDarkMode.set(this.themeManager.theme() === 'dark'));
  }

  /* computed ------------------------- */

  readablePublicId = computed(() => {
    const t = this._ticket();
    if (!t) return '';
    const pid = (t as any).publicId ?? '';
    return pid ? String(pid) : String(t.id).slice(0, 8);
  });

  statusLabel = computed(() => {
    const s = this._ticket()?.status;
    switch (s) {
      case 'Open': return 'Aperto';
      case 'WaitingSupport': return 'In attesa supporto';
      case 'WaitingUser': return 'In attesa utente';
      case 'Closed': return 'Chiuso';
      default: return String(s ?? '');
    }
  });

  statusBadgeClass = computed(() => {
    const s = this._ticket()?.status;
    // palette leggibile anche su dark
    switch (s) {
      case 'Open':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-700/40';
      case 'WaitingSupport':
        return 'bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-700/40';
      case 'WaitingUser':
        return 'bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-900/20 dark:text-sky-200 dark:border-sky-700/40';
      case 'Closed':
        return 'bg-slate-200 text-slate-700 border-slate-300/70 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600/60';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200/70 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700/60';
    }
  });

  showCloseButton = computed(() => {
    const t = this._ticket();
    if (!t || !this._allowActions()) return false;
    return t.status !== 'Closed';
  });

  showReopenButton = computed(() => {
    const t = this._ticket();
    if (!t || !this._allowActions()) return false;
    return t.status === 'Closed';
  });
}
