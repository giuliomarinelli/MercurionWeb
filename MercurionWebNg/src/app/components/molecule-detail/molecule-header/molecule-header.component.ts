import { Component, Input, signal } from '@angular/core';

@Component({
  selector: 'molecule-header',
  standalone: true,
  template: `
    <header class="space-y-2" aria-labelledby="molecule-name">
      @if (_myMol()) {
        <h2 id="molecule-name"
            class="text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left text-light-accent-primary dark:text-dark-accent-primary">
          {{ name() }}
        </h2>
      } @else {
        <h1 id="molecule-name"
            class="text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left text-light-accent-primary dark:text-dark-accent-primary">
          {{ name() }}
        </h1>
      }
        @if (_chemblIdSignal()) {
          <p class="text-xs font-semibold tracking-wide text-center sm:text-left text-light-accent-primary dark:text-dark-accent-primary">
            ChEMBL ID:
            <span class="text-muted-foreground font-normal text-light-on-surface-main dark:text-slate-100">
              {{ chemblId() }}
            </span>
          </p>
        }
    </header>

  `
})
export class MoleculeHeaderComponent {
  private readonly _nameSignal = signal<string>('');
  protected readonly _chemblIdSignal = signal<string | undefined>('');
  protected readonly _myMol = signal<boolean>(false)

  @Input()
  set nameInput(value: string) {
    this._nameSignal.set(value);
  }
  readonly name = this._nameSignal.asReadonly();

  @Input()
  set chemblIdInput(value: string | undefined) {
    this._chemblIdSignal.set(value);
  }
  readonly chemblId = this._chemblIdSignal.asReadonly();

  @Input()
  set myMol(myMol: boolean) {
    this._myMol.set(myMol)
  }
}
