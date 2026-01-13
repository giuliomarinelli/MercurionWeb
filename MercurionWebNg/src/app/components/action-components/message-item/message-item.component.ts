import { Component, Input, signal, computed, effect, inject } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { TicketMessage, ClientTicketMessage, AuthorType } from '../../../Models/graphql/help.models';
import { ThemeManagerService } from '../../../services/context/theme-manager.service';
import { TypeGuardsService } from '../../../services/type-guards.service';

type AnyMsg = TicketMessage | ClientTicketMessage;

@Component({
  selector: 'm-message-item',
  imports: [NgClass, DatePipe],
  template: `
  @if (_msg()) {
    <div class="w-full flex"
         [ngClass]="isSent() ? 'justify-end' : 'justify-start'"
         role="listitem">

      <div class="max-w-[85%] sm:max-w-[70%] md:max-w-[60%]">

          <!-- optional meta line (name + time) -->
        <div class="mb-1 flex items-center gap-1">
          <div
            class="text-[11px] sm:text-xs text-slate-700 dark:text-slate-200"
            [ngClass]="isSent() ? 'text-right' : 'text-left'"
          >
            @if (showAuthorName() && authorName()) {
              <span class="font-medium text-slate-700 dark:text-slate-200">
                {{ authorName() }}
              </span>
              <span class="mx-1 text-slate-500 dark:text-slate-500">•</span>
            }
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current size-3.5 inline-block -top-[2px] relative mr-[2px]">
              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path d="M320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64zM296 184L296 332.8L306.7 339.9L402.7 403.9L422.7 417.2L449.3 377.3C446.9 375.7 411.8 352.3 344 307.1L344 159.9L296 159.9L296 183.9z"/>
            </svg>
            <span>
              {{ _msg()!.createdAt | date :'dd/MM/yyyy HH:mm:ss' }}
            </span>
          </div>
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
          role="article"
          tabindex="0"
          aria-live="polite"
          [attr.aria-label]="(isSent() ? 'Messaggio inviato' : 'Messaggio ricevuto') + ' da ' + authorName() + ' il ' + (_msg()?.createdAt | date :'dd/MM/yyyy HH:mm:ss')"
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
        bg-light-accent-primary text-white border-light-accent-primary-hc/70
        dark:bg-indigo-500 dark:text-white dark:border-indigo-400/60
      `;
    }
    return `
      bg-slate-100 text-slate-900 border-slate-200/80
      dark:bg-slate-700/70 dark:text-slate-50 dark:border-slate-600/70
    `
  })

}
