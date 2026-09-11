import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'm-header-responsive-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content />
    @if (open()) {
      <span class="sr-only" aria-live="polite">Menu responsive aperto</span>
    }
  `
})
export class HeaderResponsiveMenuComponent {
  readonly open = input(false);
  readonly closed = output<void>();
  readonly focusRestore = output<void>();
}
