import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { HeaderSessionState } from './header.models';

@Component({
  selector: 'm-header-session-indicator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (session().loggedIn) {
      <button type="button"
              [attr.aria-label]="label()"
              [attr.title]="label()"
              (click)="toggled.emit()"
              class="avatar-toggle-button inline-flex items-center justify-center size-10 rounded-full cursor-pointer bg-light-accent-secondary/85 text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
        {{ session().initials }}
      </button>
    }
  `
})
export class HeaderSessionIndicatorComponent {
  readonly session = input.required<HeaderSessionState>();
  readonly expanded = input(false);
  readonly toggled = output<void>();

  protected label(): string {
    return this.expanded() ? 'Chiudi il menu utente' : 'Apri il menu utente';
  }
}
