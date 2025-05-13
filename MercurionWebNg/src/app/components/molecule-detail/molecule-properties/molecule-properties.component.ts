import { Component, Input, signal } from '@angular/core';
import { MoleculeProperties } from '../../../Models/graphql/molecule.detail';


@Component({
  selector: 'molecule-properties',
  standalone: true,
  template: `
    <section class="mt-4 text-center xs:text-left">
      <h2 class="text-lg font-semibold mb-6 text-light-accent-primary dark:text-dark-accent-primary">
        Proprietà chimico-fisiche
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div><span class="font-semibold text-light-on-surface-main dark:text-slate-100">Peso molecolare:</span> {{ props().mwFreebase ?? 'ND' }}</div>
        <div><span class="font-semibold text-light-on-surface-main dark:text-slate-100">logP:</span> {{ props().alogp ?? 'ND' }}</div>
        <div><span class="font-semibold text-light-on-surface-main dark:text-slate-100">H-bond donor:</span> {{ props().hbd ?? 'ND' }}</div>
        <div><span class="font-semibold text-light-on-surface-main dark:text-slate-100">H-bond acceptor:</span> {{ props().hba ?? 'ND' }}</div>
        <div><span class="font-semibold text-light-on-surface-main dark:text-slate-100">PSA:</span> {{ props().psa ?? 'ND' }}</div>
        <div><span class="font-semibold text-light-on-surface-main dark:text-slate-100">Rotatable bonds:</span> {{ props().rtb ?? 'ND' }}</div>
      </div>
    </section>
  `,
})
export class MoleculePropertiesComponent {

  private readonly propsSignal = signal<MoleculeProperties>({
    mwFreebase: null,
    alogp: null,
    hba: null,
    hbd: null,
    psa: null,
    rtb: null
  })

  @Input()
  set properties(value: MoleculeProperties) {
    this.propsSignal.set(value)
  }

  readonly props = this.propsSignal.asReadonly()
}
