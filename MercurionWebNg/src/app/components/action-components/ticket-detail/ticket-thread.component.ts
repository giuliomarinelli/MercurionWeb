import {
  afterNextRender, ChangeDetectionStrategy, Component, ElementRef, inject, Injector,
  input, OnChanges, output, signal, SimpleChanges, viewChild,
} from '@angular/core'
import { TicketMessageViewModel } from '../../../Models/graphql/help.view-models'
import { TicketDetailInnerScope } from '../../../Models/action/action-overlay.models'
import { MessageItemComponent } from '../message-item/message-item.component'
import { ButtonComponent } from '../../common/button/button.component'
import { ProgressIndicatorComponent } from '../../common/progress-indicator/progress-indicator.component'

@Component({
  selector: 'm-ticket-thread',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MessageItemComponent, ButtonComponent, ProgressIndicatorComponent],
  template: `
    <section class="min-w-0 px-3 py-4 sm:px-6" aria-labelledby="ticket-thread-heading">
      <div class="mb-3 flex min-h-11 flex-wrap items-center justify-between gap-2">
        <h3 id="ticket-thread-heading" class="text-sm font-semibold">Conversazione</h3>
        @if (!done() || pageError()) {
          <m-button variant="outline" [loading]="pagePending()" [disabled]="refreshing()"
            (pressed)="pageError() ? retry.emit() : loadMore.emit()">
            {{ pageError() ? 'Riprova caricamento' : 'Messaggi precedenti' }}
          </m-button>
        }
      </div>
      @if (pageError()) {
        <p class="mb-3 text-sm text-red-700 dark:text-red-300" role="alert">{{ pageError() }}</p>
      }
      <div #scrollRoot
        class="m-scroll-thin min-w-0 overflow-y-auto overscroll-contain rounded-lg outline-none [overflow-anchor:none] focus-visible:ring-2 focus-visible:ring-light-accent-primary-hq"
        [class.h-[clamp(12rem,40dvh,28rem)]]="messages().length > 0"
        role="region" aria-label="Messaggi del ticket" tabindex="0" (scroll)="onScroll()">
        @if (!messages().length && pagePending()) {
          <div class="flex min-h-32 items-center justify-center">
            <m-progress-indicator size="md" label="Caricamento messaggi…" />
          </div>
        } @else if (!messages().length && !pageError()) {
          <p class="py-8 text-center text-sm text-on-surface-secondary">Non ci sono ancora messaggi.</p>
        }
        <div class="flex min-w-0 flex-col gap-4 px-1 py-2" role="list" aria-label="Storico della conversazione">
          @for (message of messages(); track message.id) {
            <m-message-item [attr.data-message-id]="message.id" [message]="message" [selfAuthorType]="scope()" [showAuthor]="true" />
          }
        </div>
      </div>
      <div aria-live="polite" class="mt-2 text-sm">
        @if (hasNewMessages()) {
          <m-button variant="outline" (pressed)="showLatest()">Nuovi messaggi · Vai agli ultimi</m-button>
        }
      </div>
    </section>
  `,
})
export class TicketThreadComponent implements OnChanges {
  readonly messages = input.required<readonly TicketMessageViewModel[]>()
  readonly scope = input.required<TicketDetailInnerScope>()
  readonly pagePending = input(false)
  readonly pageError = input<string | null>(null)
  readonly done = input(false)
  readonly refreshing = input(false)
  readonly sentRevision = input(0)
  readonly loadMore = output<void>()
  readonly retry = output<void>()
  protected readonly hasNewMessages = signal(false)
  private readonly injector = inject(Injector)
  private readonly scrollRoot = viewChild<ElementRef<HTMLDivElement>>('scrollRoot')
  private previousIds: string[] = []
  private followSentMessage = false

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sentRevision'] && !changes['sentRevision'].firstChange) this.followSentMessage = true
    if (!changes['messages']) return
    const root = this.scrollRoot()?.nativeElement
    const previousIds = this.previousIds
    const nextIds = this.messages().map(message => message.id)
    const initial = previousIds.length === 0
    const appended = previousIds.length > 0 && nextIds.at(-1) !== previousIds.at(-1)
    const nearBottom = !root || root.scrollHeight - root.clientHeight - root.scrollTop < 48
    const previousTop = root?.scrollTop ?? 0
    const anchor = root && [...root.querySelectorAll<HTMLElement>('[data-message-id]')]
      .find(element => element.getBoundingClientRect().bottom > root.getBoundingClientRect().top)
    const anchorId = anchor?.dataset['messageId']
    const anchorOffset = root && anchor ? anchor.getBoundingClientRect().top - root.getBoundingClientRect().top : 0
    this.previousIds = nextIds
    afterNextRender(() => {
      const element = this.scrollRoot()?.nativeElement
      if (!element) return
      if (initial || (appended && (nearBottom || this.followSentMessage))) {
        element.scrollTop = element.scrollHeight
        this.hasNewMessages.set(false)
      } else {
        const retained = [...element.querySelectorAll<HTMLElement>('[data-message-id]')]
          .find(item => item.dataset['messageId'] === anchorId)
        element.scrollTop = retained
          ? previousTop + retained.getBoundingClientRect().top - element.getBoundingClientRect().top - anchorOffset
          : previousTop
        if (appended) this.hasNewMessages.set(true)
      }
      if (appended) this.followSentMessage = false
    }, { injector: this.injector })
  }

  showLatest(): void {
    const root = this.scrollRoot()?.nativeElement
    if (!root) return
    root.scrollTo({ top: root.scrollHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    this.hasNewMessages.set(false)
  }

  onScroll(): void {
    const root = this.scrollRoot()?.nativeElement
    if (!root) return
    if (root.scrollHeight - root.clientHeight - root.scrollTop < 48) this.hasNewMessages.set(false)
    if (root.scrollTop <= 8 && !this.pagePending() && !this.pageError() && !this.done() && !this.refreshing()) this.loadMore.emit()
  }
}
