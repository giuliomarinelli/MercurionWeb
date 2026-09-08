import { Component, ChangeDetectionStrategy, effect, input, computed, signal } from '@angular/core';

type MoleculeProperties = {
  mwFreebase: number | string | null
  alogp: number | string | null
  hba: number | string | null
  hbd: number | string | null
  psa: number | string | null
  rtb: number | string | null
}

const EMPTY_MOLECULE_PROPERTIES: MoleculeProperties = {
  mwFreebase: null,
  alogp: null,
  hba: null,
  hbd: null,
  psa: null,
  rtb: null
};

@Component({
  selector: 'm-molecule-properties',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mt-6" aria-labelledby="molecule-properties-heading">
      <h2 class="text-xl font-semibold mb-3 text-light-accent-primary-hc dark:text-dark-accent-primary text-center sm:text-left">
        <span id="molecule-properties-heading">Proprietà chimico-fisiche</span>
      </h2>

      <div class="rounded-xl border border-border bg-gray-200/40 dark:bg-gray-700/40 p-4 shadow-sm">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm">
          @for (item of propertiesList(); track item.label) {
            <div>
              <span class="text-muted-foreground">{{ item.label }}:&nbsp;</span>
              <span class="font-medium">{{ item.value }}</span>
            </div>
          }
        </div>
      </div>
    </section>
  ` })
export class MoleculePropertiesComponent {
  private readonly propsSignal = signal<MoleculeProperties>(EMPTY_MOLECULE_PROPERTIES);

  readonly properties = input<MoleculeProperties | undefined>(undefined)
  private readonly syncProperties = effect(() =>
    this.propsSignal.set(this.properties() ?? EMPTY_MOLECULE_PROPERTIES)
  )

  readonly props = this.propsSignal.asReadonly();

  readonly propertiesList = computed(() => {
    const props = this.props();
    return [
      { label: 'Peso molecolare', value: props.mwFreebase ?? 'ND' },
      { label: 'logP', value: props.alogp ?? 'ND' },
      { label: 'H-bond donor', value: props.hbd ?? 'ND' },
      { label: 'H-bond acceptor', value: props.hba ?? 'ND' },
      { label: 'PSA', value: props.psa ?? 'ND' },
      { label: 'Rotatable bonds', value: props.rtb ?? 'ND' },
    ]
  })
}
