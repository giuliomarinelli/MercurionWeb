import { Component, Input, signal, computed, effect, inject } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { TicketMessage, ClientTicketMessage, AuthorType } from '../../../Models/graphql/help.models';
import { ThemeManagerService } from '../../../services/context/theme-manager.service';
import { TypeGuardsService } from '../../../services/type-guards.service';

type AnyMsg = TicketMessage | ClientTicketMessage;

@Component({
  selector: 'm-message-item',
  standalone: true,
  imports: [NgClass, DatePipe],
  template: `
  @if (_msg()) {
    <div class="w-full flex"
         [ngClass]="isSent() ? 'justify-end' : 'justify-start'">

      <div class="max-w-[85%] sm:max-w-[70%] md:max-w-[60%]">

        <!-- optional meta line (name + time) -->
        <div
          class="mb-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400"
          [ngClass]="isSent() ? 'text-right' : 'text-left'"
        >
          @if (showAuthorName() && authorName()) {
            <span class="font-medium text-slate-600 dark:text-slate-300">
              {{ authorName() }}
            </span>
            <span class="mx-1 text-slate-300 dark:text-slate-600">•</span>
          }
          <span>
            {{ _msg()!.createdAt | date:'short' }}
          </span>
        </div>

        <!-- bubble -->
        <div
          class="
            relative rounded-2xl px-3.5 py-2.5 text-sm sm:text-[0.95rem] leading-relaxed
            border shadow-sm
            transition-all duration-200
            whitespace-normal break-words
          "
          [ngClass]="bubbleClass()"
          [attr.aria-label]="isSent() ? 'Messaggio inviato' : 'Messaggio ricevuto'"
        >
          <!-- contenuto HTML da quill -->
          <div class="prose prose-sm dark:prose-invert max-w-none"
               [innerHTML]="_msg()!.contentHtml">
          </div>
        </div>
      </div>
    </div>
  }
  `
})
export class MessageItemComponent {

  private readonly themeManager = inject(ThemeManagerService)
  protected readonly typeGuards = inject(TypeGuardsService)

  // ---------------- inputs ----------------
  @Input({ required: true })
  set message(m: AnyMsg) {
    this._msg.set(m)
  }

  /** chi sono io in questa vista? default: User */
  @Input()
  set selfAuthorType(t: AuthorType) {
    this._selfAuthorType.set(t ?? 'User')
  }

  /** mostra nome autore (utile per support view) */
  @Input()
  set showAuthor(v: boolean) {
    this._showAuthor.set(!!v)
  }

  // ---------------- state ----------------
  _msg = signal<AnyMsg | undefined>(undefined)
  _selfAuthorType = signal<AuthorType>('User')
  _showAuthor = signal<boolean>(false)
  isDarkMode = signal<boolean>(false)

  constructor() {
    effect(() => this.isDarkMode.set(this.themeManager.theme() === 'dark'))
  }

  // ---------------- computed ----------------
  isSent = computed(() => {
    const m = this._msg()
    if (!m) return false
    return m.authorType === this._selfAuthorType()
  });

  showAuthorName = computed(() => this._showAuthor())

  authorName = computed(() => {
    const m = this._msg()
    if (!m) {
      return ''
    }
    // fullName solo per TicketMessage (support scope)
    if (this.typeGuards.isTicketMessage(m)) {
      return m.authorType === 'User'
        ? (m.authorFullName || m.userFullName || 'Utente')
        : (m.authorFullName || 'Supporto')
    }
    return m.authorType === 'User' ? 'Tu' : 'Supporto'
  })

  bubbleClass = computed(() => {

    const sent = this.isSent()

    // Colori scelti per contrasto:
    // - sent: indigo/sky abbastanza saturo per white bg e dark surface
    // - received: slate chiaro su white, slate scuro su dark
    if (sent) {
      return `
        bg-indigo-600 text-white border-indigo-500/70
        dark:bg-indigo-500 dark:text-white dark:border-indigo-400/60
      `;
    }
    return `
      bg-slate-100 text-slate-900 border-slate-200/80
      dark:bg-slate-700/70 dark:text-slate-50 dark:border-slate-600/70
    `
  })

}
