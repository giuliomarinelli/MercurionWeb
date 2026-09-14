import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'm-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `


      @if (avatarId()) {

      } @else {
        <button
          [innerHTML]="initials()"
          class="avatar-toggle-button rounded-full cursor-pointer bg-light-accent-secondary-500/80 text-slate-100 dark:bg-dark-accent-primary-btn bg-light-accent-secondary/85 hover:bg-light-accent-secondary/65 dark:hover:bg-dark-accent-primary-btn/90 p-2 text-sm font-semibold transition-colors duration-300"
          type="button"
          [attr.aria-label]="ariaLabel() || 'Avatar utente'"
        ></button>
      }

  `
})
export class AvatarComponent {

  readonly initials = input.required<string>()
  readonly type = input.required<'header' | 'profile'>()
  readonly avatarId = input<string>()
  readonly ariaLabel = input<string>();

}
