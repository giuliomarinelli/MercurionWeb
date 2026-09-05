import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'm-molecule-badge',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `

    <button
      class="
        inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium
        bg-indigo-50 text-light-accent-primary-hc shrink-0
        dark:bg-slate-900/40 dark:text-dark-accent-primary-btn-hc
        border border-indigo-200/70 dark:border-slate-500
        hover:transform hover:scale-[1.03] transition-transform cursor-default
      "
      type="button"
      [attr.aria-label]="'Molecola ' + _name()"
      aria-live="polite"
    >
      {{_name()}}

    </button>

  `
})
export class MoleculeBadgeComponent {

  readonly name = input.required<string>()
  readonly _name = computed(() => this.name())

}
