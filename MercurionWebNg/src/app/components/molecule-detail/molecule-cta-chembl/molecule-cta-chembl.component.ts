import { Component, Input, Signal, computed, signal } from '@angular/core';

@Component({
  selector: 'molecule-cta-chembl',
  standalone: true,
  template: `
    <section class="mt-6">
      <a
        [href]="url()"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition dark:bg-indigo-500 dark:hover:bg-indigo-400"
      >
        🔗 Vedi su ChEMBL
      </a>
    </section>
  `
})
export class MoleculeCtaChemblComponent {
  private readonly idSignal = signal<string>('');

  @Input()
  set chemblId(value: string) {
    this.idSignal.set(value);
  }

  readonly url: Signal<string> = computed(() =>
    `https://www.ebi.ac.uk/chembl/compound_report_card/${this.idSignal()}/`
  )
}
