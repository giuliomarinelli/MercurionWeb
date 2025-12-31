import { Component, Input, signal } from '@angular/core';

@Component({
  selector: 'm-avatar',
  imports: [],
  template: `


      @if (_avatarId()) {

      } @else {
        <button
          [innerHTML]="_initials()"
          class="avatar-toggle-button rounded-full cursor-pointer bg-light-accent-secondary-500/80 text-slate-100 dark:bg-dark-accent-primary-btn bg-light-accent-secondary/85 hover:bg-light-accent-secondary/65 dark:hover:bg-dark-accent-primary-btn/90 p-2 text-sm font-semibold transition-colors duration-300"
          type="button"
          [attr.aria-label]="ariaLabel || 'Avatar utente'"
        ></button>
      }

  `
})
export class AvatarComponent {

  readonly _initials = signal<string>('')
  readonly _type = signal<'header' | 'profile'>('header')
  readonly _avatarId = signal<string | null>(null)

  @Input({ required: true })
  set initials(initials: string) {
    this._initials.set(initials)
  }

  @Input({ required: true })
  set type(type: 'header' | 'profile') {
    this._type.set(type)
  }

  @Input()
  set avatarId(avatarId: string) {
    this._avatarId.set(avatarId)
  }

  @Input() ariaLabel?: string

}
