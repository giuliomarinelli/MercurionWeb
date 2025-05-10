import { Component, Input, signal } from '@angular/core';

@Component({
  selector: 'molecule-header',
  standalone: true,
  template: `
    <header>
      <h1>{{ name() }}</h1>
      <p>ChEMBL ID: {{ chemblId() }}</p>
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
