import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'm-molecule-synonyms',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mt-6 mb-6" aria-labelledby="synonyms-heading">
      <h2 id="synonyms-heading" class="text-xl font-semibold mb-3 text-light-accent-primary-hc dark:text-dark-accent-primary text-left">Sinonimi</h2>
      @if (synonymsInput().length > 0) {
        <ul class="flex flex-wrap gap-2 items-start min-w-0">
          @for (syn of synonymsInput(); track syn) {
            <li class="max-w-full wrap-anywhere px-3 py-2 rounded-xl border border-token-border bg-light-surface-secondary dark:bg-dark-surface-secondary text-sm text-light-on-surface-main dark:text-dark-on-surface-main">
              {{ syn }}
            </li>
          }
        </ul>
      } @else {
        <p class="text-sm text-light-on-surface-secondary dark:text-dark-on-surface-secondary">Nessun sinonimo disponibile.</p>
      }
    </section>
  `
})
export class MoleculeSynonymsComponent {

  readonly synonymsInput = input<string[]>([])

}
