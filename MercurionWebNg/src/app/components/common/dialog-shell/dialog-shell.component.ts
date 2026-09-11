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

export type DialogDismissalPolicy = {
  escape: boolean;
  backdrop: boolean;
};

@Component({
  selector: 'm-dialog-shell',
  standalone: true,
  imports: [A11yModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (mounted()) {
      <div
        #dialog
        class="fixed inset-0 z-[999] backdrop-blur-sm transition-all duration-300 m-dialog-backdrop"
        [class]="backdropClass()"
        [class.opacity-0]="!open()"
        [class.opacity-100]="open()"
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
      >
        <div class="min-h-full flex items-center justify-center p-4 m-overscroll-touch">
          <div [class]="panelClass()"
               (click)="$event.stopPropagation()">
            <ng-content />
          </div>
        </div>
      </div>
    }
  `
})
export class DialogShellComponent {
  readonly open = input(false);
  readonly mounted = input(false);
  readonly labelledBy = input<string | null>(null);
  readonly describedBy = input<string | null>(null);
  readonly label = input<string | null>(null);
  readonly backdropClass = input('bg-black/60');
  readonly panelClass = input('w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden dark:bg-slate-900');
  readonly dismissalPolicy = input<DialogDismissalPolicy>({ escape: true, backdrop: true });
  readonly dismissed = output<'escape' | 'backdrop'>();

  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly document = inject(DOCUMENT);
  private readonly scrollLock = inject(DialogScrollLockService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly opener = signal<HTMLElement | null>(null);
  private locked = false;

  constructor() {
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
      if (this.locked) this.scrollLock.unlock();
      this.restoreFocus();
    });
  }

  onEscape(event: Event): void {
    event.stopPropagation();
    if (this.open() && this.dismissalPolicy().escape) this.dismissed.emit('escape');
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && this.open() && this.dismissalPolicy().backdrop) {
      this.dismissed.emit('backdrop');
    }
  }

  private focusInitialElement(): void {
    if (!this.open()) return;
    const target = this.element.nativeElement.querySelector(
      '[autofocus], button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement | null;
    target?.focus();
  }

  private restoreFocus(): void {
    const opener = this.opener();
    this.opener.set(null);
    if (opener?.isConnected && !opener.hasAttribute('disabled')) opener.focus();
  }
}
