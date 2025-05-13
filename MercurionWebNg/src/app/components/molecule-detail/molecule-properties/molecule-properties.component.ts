import { Component, Input, signal } from '@angular/core';
import { MoleculeProperties } from '../../../Models/graphql/molecule.detail';

@Component({
  selector: 'molecule-properties',
  standalone: true,
  template: `
    <section class="mt-6">
      <h2 class="text-base font-semibold mb-3 text-light-accent-primary dark:text-dark-accent-primary">
        Proprietà chimico-fisiche
      </h2>

      <div class="rounded-xl border border-border bg-background/50 p-4 shadow-sm">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm">
          <div>
            <span class="text-muted-foreground">Peso molecolare: </span>
            <span class="font-medium">{{ props().mwFreebase ?? 'ND' }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">logP: </span>
            <span class="font-medium">{{ props().alogp ?? 'ND' }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">H-bond donor: </span>
            <span class="font-medium">{{ props().hbd ?? 'ND' }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">H-bond acceptor: </span>
            <span class="font-medium">{{ props().hba ?? 'ND' }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">PSA: </span>
            <span class="font-medium">{{ props().psa ?? 'ND' }}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Rotatable bonds:  </span>
            <span class="font-medium">{{ props().rtb ?? 'ND' }}</span>
          </div>
        </div>
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
    rtb: null,
  });

  @Input()
  set properties(value: MoleculeProperties) {
    this.propsSignal.set(value);
  }

  readonly props = this.propsSignal.asReadonly()
}
