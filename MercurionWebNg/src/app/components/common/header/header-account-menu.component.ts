import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { HeaderSessionState } from './header.models';

@Component({
  selector: 'm-header-account-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content />
    @if (session().loggedIn) {
      <span class="sr-only" aria-live="polite">Account menu disponibile</span>
    }
  `
})
export class HeaderAccountMenuComponent {
  readonly session = input.required<HeaderSessionState>();
  readonly action = output<'open' | 'close' | 'logout'>();
}
