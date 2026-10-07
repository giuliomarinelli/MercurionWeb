import { A11yModule } from '@angular/cdk/a11y';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { DialogScrollLockService } from './dialog-scroll-lock.service';
import { ViewportRuntimeService } from '../../../services/context/viewport-runtime.service';

export type DialogDismissalPolicy = {
  escape: boolean;
  backdrop: boolean;
};

export type DialogBackdropVariant = 'default' | 'action' | 'search';
export type DialogPanelVariant = 'default' | 'action' | 'search';

const BACKDROP_CLASSES = {
  default: 'bg-black/60',
  action: 'bg-slate-300/75 dark:bg-slate-900/90 action-overlay-backdrop',
  search: 'bg-black/70 text-light-on-surface-main dark:text-slate-50',
} satisfies Record<DialogBackdropVariant, string>;

const PANEL_CLASSES = {
  default: 'w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden dark:bg-slate-900',
  action: 'w-full bg-transparent shadow-none overflow-visible',
  search: 'w-full min-w-0 !max-w-none !bg-transparent !shadow-none !rounded-none !overflow-visible',
} satisfies Record<DialogPanelVariant, string>;

const CONTENT_CLASSES = {
  default: 'p-4',
  action: 'p-0',
  search: 'p-0',
} satisfies Record<DialogPanelVariant, string>;

@Component({
  selector: 'm-dialog-shell',
  standalone: true,
  imports: [A11yModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (mounted()) {
      <div
        #dialog
        class="fixed inset-0 z-[999] overflow-y-auto m-scroll-thin transition-opacity duration-300 m-dialog-backdrop"
        [class]="BACKDROP_CLASSES[backdropVariant()]"
        [class.opacity-0]="!open()"
        [class.opacity-100]="open()"
        [class.m-dialog--compact]="viewport.overlayCompact()"
        [class.m-dialog--short]="viewport.visualHeight() < 260"
        role="dialog"
        aria-modal="true"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="open()"
        [attr.aria-labelledby]="labelledBy() || null"
        [attr.aria-describedby]="describedBy() || null"
        [attr.aria-label]="label() || null"
        [attr.aria-hidden]="!open()"
        [attr.tabindex]="open() ? -1 : null"
        (click)="onBackdropClick($event)"
        (keydown.escape)="onEscape($event)"
        (focusin)="scheduleFocusedControlVisibility()"
      >
        <div class="m-dialog-content min-h-full flex items-center justify-center" [class]="CONTENT_CLASSES[panelVariant()]">
          <div class="m-dialog-panel m-scroll-thin" [class]="PANEL_CLASSES[panelVariant()]"
               [class.m-dialog-panel--default]="panelVariant() === 'default'"
               (click)="$event.stopPropagation()">
            <ng-content />
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .m-dialog-backdrop {
      top: var(--m-overlay-viewport-top, 0px);
      bottom: auto;
      left: var(--m-overlay-viewport-left, 0px);
      right: auto;
      width: var(--m-overlay-viewport-width, 100%);
      height: calc(var(--m-overlay-vh, 1dvh) * 100);
      transition-property: opacity;
    }

    .m-dialog-content {
      min-height: 100%;
    }

    .m-dialog-panel {
      min-width: 0;
    }

    .m-dialog-panel--default {
      max-height: calc(var(--m-overlay-vh, 1dvh) * 100 - 2rem);
      overflow-y: auto;
    }
  `
})
export class DialogShellComponent {
  readonly open = input(false);
  readonly mounted = input(false);
  readonly labelledBy = input<string | null>(null);
  readonly describedBy = input<string | null>(null);
  readonly label = input<string | null>(null);
  readonly backdropVariant = input<DialogBackdropVariant>('default');
  readonly panelVariant = input<DialogPanelVariant>('default');
  readonly dismissalPolicy = input<DialogDismissalPolicy>({ escape: true, backdrop: true });
  readonly dismissed = output<'escape' | 'backdrop'>();

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly scrollLock = inject(DialogScrollLockService);
  protected readonly viewport = inject(ViewportRuntimeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly opener = signal<HTMLElement | null>(null);
  private locked = false;
  private focusFrame = 0;

  protected readonly BACKDROP_CLASSES = BACKDROP_CLASSES;
  protected readonly PANEL_CLASSES = PANEL_CLASSES;
  protected readonly CONTENT_CLASSES = CONTENT_CLASSES;

  constructor() {
    effect(() => {
      this.viewport.state();
      this.scheduleFocusedControlVisibility();
    });
    effect(() => {
      const active = this.open();
      if (active && !this.locked) {
        this.opener.set(this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null);
        this.scrollLock.lock();
        this.locked = true;
        queueMicrotask(() => this.focusInitialElement());
      } else if (!active && this.locked) {
        this.scrollLock.unlock();
        this.locked = false;
        this.restoreFocus();
      }
    });

    this.destroyRef.onDestroy(() => {
      this.document.defaultView?.cancelAnimationFrame(this.focusFrame);
      if (this.locked) this.scrollLock.unlock();
      this.restoreFocus();
    });
  }

  onEscape(event: Event): void {
    event.stopPropagation();
    if (this.open() && this.dismissalPolicy().escape) this.dismissed.emit('escape');
  }

  protected scheduleFocusedControlVisibility(): void {
    const win = this.document.defaultView;
    if (!win || !this.open()) return;
    win.cancelAnimationFrame(this.focusFrame);
    this.focusFrame = win.requestAnimationFrame(() => {
      this.focusFrame = 0;
      const active = this.document.activeElement as HTMLElement | null;
      if (active && this.element.nativeElement.contains(active) &&
          active.matches('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) {
        // Scroll only the dialog's content; scrollIntoView can also pan the iOS document.
        let parent = active.parentElement;
        const dialog = this.element.nativeElement.querySelector<HTMLElement>('[role="dialog"]');
        while (parent && dialog?.contains(parent)) {
          if (/auto|scroll/.test(win.getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight) {
            const bounds = parent.getBoundingClientRect();
            const field = active.getBoundingClientRect();
            const header = parent.querySelector<HTMLElement>(':scope > header');
            const top = header && win.getComputedStyle(header).position === 'sticky'
              ? Math.max(bounds.top, header.getBoundingClientRect().bottom) : bounds.top;
            const footer = parent.querySelector<HTMLElement>(':scope > m-action-footer');
            const bottom = footer && win.getComputedStyle(footer).position === 'sticky'
              ? Math.min(bounds.bottom, footer.getBoundingClientRect().top) : bounds.bottom;
            if (this.viewport.overlayCompact() && active.matches('input[type="search"], input[role="combobox"]') && field.top > top + 4) {
              // Search needs room for its answers below the focused field.
              parent.scrollTop += field.top - top - 4;
            } else if (field.bottom > bottom) parent.scrollTop += field.bottom - bottom + 4;
            else if (field.top < top) parent.scrollTop -= top - field.top + 4;
          }
          if (parent === dialog) break;
          parent = parent.parentElement;
        }
      }
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && this.open() && this.dismissalPolicy().backdrop) {
      this.dismissed.emit('backdrop');
    }
  }

  private focusInitialElement(): void {
    if (!this.open()) return;
    const target = this.element.nativeElement.querySelector<HTMLElement>('[cdkFocusInitial]') ?? this.element.nativeElement.querySelector<HTMLElement>(
      '[autofocus], button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    target?.focus({ preventScroll: true });
  }

  private restoreFocus(): void {
    const opener = this.opener();
    this.opener.set(null);
    if (opener?.isConnected && !opener.hasAttribute('disabled')) opener.focus({ preventScroll: true });
  }
}
