import { Component, ChangeDetectionStrategy, Input, signal } from '@angular/core';

@Component({
  selector: 'm-molecule-synonyms',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mt-4 mb-8" aria-labelledby="synonyms-heading">
      <h2 id="synonyms-heading" class="text-xl font-semibold pb-4 text-light-accent-primary-hc dark:text-dark-accent-primary text-center sm:text-left">Sinonimi</h2>
      @if (synonyms().length > 0) {
        <ul class="max-w-44 sm:max-w-none mx-auto flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-2 justify-center sm:justify-start items-center sm:items-start">
          @for (syn of synonyms(); track syn) {
            <li class="px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100 cursor-default hover:transform hover:scale-[1.05] transition-transform duration-300">
              {{ syn }}
            </li>
          }
        </ul>
      } @else {
        <p class="text-sm text-center text-gray-500 dark:text-gray-400 relative -top-2">Nessun sinonimo disponibile.</p>
      }
    </section>
  `
})
export class MoleculeSynonymsComponent {

  private readonly synonymsSignal = signal<string[]>([])

  @Input()
  set synonymsInput(value: string[]) {
    this.synonymsSignal.set(value)
  }

  readonly synonyms = this.synonymsSignal.asReadonly()

}
