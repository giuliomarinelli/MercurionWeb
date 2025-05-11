import { Component, Input, signal } from '@angular/core';

@Component({
  selector: 'molecule-header',
  standalone: true,
  template: `
    <header>
      <h1 class="text-light-accent-primary text-center xs:text-left dark:text-dark-accent-primary text-2xl md:text-3xl font-semibold mb-12 tracking-wider">
        {{ name() }}
      </h1>
      <p class="text-xs text-center xs:text-left tracking-wider text-emerald-600 dark:text-dark-accent-secondary font-semibold mb-3">
        ChEMBL ID:
        <span class="font-light text-light-on-surface-main dark:text-slate-100">
        {{ chemblId() }}
      </span>
    </p>
    </header>
  `,
})
export class MoleculeHeaderComponent {
  private readonly _nameSignal = signal<string>('')
  private readonly _chemblIdSignal = signal<string>('')

  @Input()
  set nameInput(value: string) {
    this._nameSignal.set(value);
  }
  readonly name = this._nameSignal.asReadonly()

  @Input()
  set chemblIdInput(value: string) {
    this._chemblIdSignal.set(value)
  }
  readonly chemblId = this._chemblIdSignal.asReadonly()
}
