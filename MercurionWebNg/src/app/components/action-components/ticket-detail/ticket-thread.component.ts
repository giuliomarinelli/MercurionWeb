import { ChangeDetectionStrategy, Component, ElementRef, OnChanges, SimpleChanges, input, output, viewChild } from '@angular/core';
import { TicketMessageViewModel } from '../../../Models/graphql/help.view-models';
import { TicketDetailInnerScope } from '../../../Models/action/action-overlay.models';
import { MessageItemComponent } from '../message-item/message-item.component';

@Component({
  selector: 'm-ticket-thread',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MessageItemComponent],
  template: `
    <div #scrollRoot class="py-6 px-3 overflow-y-auto flex flex-col gap-4 m-overscroll-touch m-overlay-body m-scroll-thin"
         role="list" aria-label="Messaggi del ticket" aria-live="polite" (scroll)="onScroll()">
      @if (pageError()) {
        <button type="button" class="mx-auto text-sm underline" (click)="retry.emit()">Riprova caricamento</button>
      }
      @if (pagePending()) { <p class="text-center text-xs" role="status">Caricamento messaggi…</p> }
      @for (message of messages(); track message.id) {
        <m-message-item [message]="message" [selfAuthorType]="scope()" [showAuthor]="scope() === 'Support'" />
      }
    </div>
  `,
})
export class TicketThreadComponent implements OnChanges {
  readonly messages = input.required<readonly TicketMessageViewModel[]>();
  readonly scope = input.required<TicketDetailInnerScope>();
  readonly pagePending = input(false);
  readonly pageError = input<string | null>(null);
  readonly loadMore = output<void>();
  readonly retry = output<void>();
  private readonly scrollRoot = viewChild<ElementRef<HTMLDivElement>>('scrollRoot');
  private previousCount = 0;
  private previousHeight = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['messages']) return;
    const root = this.scrollRoot()?.nativeElement;
    const nextCount = this.messages().length;
    queueMicrotask(() => {
      const element = this.scrollRoot()?.nativeElement;
      if (!element) return;
      if (this.previousCount === 0 || nextCount < this.previousCount) element.scrollTop = element.scrollHeight;
      else if (nextCount > this.previousCount) element.scrollTop += element.scrollHeight - this.previousHeight;
      this.previousHeight = element.scrollHeight;
      this.previousCount = nextCount;
    });
    if (root) this.previousHeight = root.scrollHeight;
  }

  onScroll(): void {
    const root = this.scrollRoot()?.nativeElement;
    if (root && root.scrollTop <= 8 && !this.pagePending()) this.loadMore.emit();
  }
}
