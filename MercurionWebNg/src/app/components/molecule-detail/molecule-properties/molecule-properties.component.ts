import { Component, Input, computed, signal } from '@angular/core';

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
          @for (item of propertiesList(); track item.label) {
            <div>
              <span class="text-muted-foreground">{{ item.label }}:</span>
              <span class="font-medium">{{ item.value }}</span>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class MoleculePropertiesComponent {
  private readonly propsSignal = signal({
    mwFreebase: null,
    alogp: null,
    hba: null,
    hbd: null,
    psa: null,
    rtb: null,
  });

  @Input()
  set properties(value: any) {
    this.propsSignal.set(value);
  }

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
