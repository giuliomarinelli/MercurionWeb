import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';

type MoleculeProperties = {
  mwFreebase: number | string | null
  alogp: number | string | null
  hba: number | string | null
  hbd: number | string | null
  psa: number | string | null
  rtb: number | string | null
}

@Component({
  selector: 'm-molecule-properties',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './molecule-properties.component.css',
  template: `
    <section class="mt-6" aria-labelledby="molecule-properties-heading">
      <h2 class="text-xl font-semibold mb-3 text-light-accent-primary-hc dark:text-dark-accent-primary text-left">
        <span id="molecule-properties-heading">Proprietà chimico-fisiche</span>
      </h2>

      <dl class="m-properties-grid">
        @for (item of propertiesList(); track item.label) {
          <div class="m-property">
            <dt>{{ item.label }}</dt>
            <dd [class.m-property--missing]="item.missing">{{ item.value }}</dd>
          </div>
        }
      </dl>
    </section>
  ` })
export class MoleculePropertiesComponent {
  readonly properties = input<Partial<MoleculeProperties> | undefined>(undefined);
  readonly props = computed(() => this.properties() ?? {});
  readonly propertiesList = computed(() => {
    const props = this.props();
    return [
      ['Massa molare (g/mol)', props.mwFreebase],
      ['logP', props.alogp],
      ['Donatori di legami a idrogeno', props.hbd],
      ['Accettori di legami a idrogeno', props.hba],
      ['Superficie polare (PSA, Å²)', props.psa],
      ['Legami ruotabili', props.rtb]
    ].map(([label, value]) => {
      const missing = value == null || String(value).trim() === '';
      return { label, value: missing ? 'Non disponibile' : value, missing };
    });
  });
}
