import { Component, Input, signal } from '@angular/core';

@Component({
  selector: 'app-molecule-badge',
  imports: [],
  template: `

    <div
      class="
        inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium
        bg-indigo-50 text-light-accent-primary shrink-0
        dark:bg-slate-700/30 dark:text-dark-accent-primary
        border border-indigo-200/70 dark:border-indigo-700/40
        group-hover:scale-[1.02] transition-transform
      "
    >
      {{_name()}}

    </div>

  `
})
export class MoleculeBadgeComponent {

  _name = signal<string>('')

  @Input({ required: true })
  set name(name: string) {
    this._name.set(name)
  }

}
