import { MyMoleculeCustomDetailSaveModel } from '../../../Models/my-molecule-custom-detail-save.model';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { MyMoleculeCustomDetailsComponent } from '../my-molecule-custom-details/my-molecule-custom-details.component';
import { MoleculeBadgeComponent } from '../molecule-badge/molecule-badge.component';

@Component({
  selector: 'molecule-header',
  standalone: true,
  imports: [MyMoleculeCustomDetailsComponent, MoleculeBadgeComponent],
  template: `
    <header class="space-y-2" aria-labelledby="molecule-name">
      @if (_myMol()) {
        @if (!_isCustom()) {
          <div class="flex gap-6 items-center">
            <h2 id="molecule-name"
                class="text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left text-light-accent-primary dark:text-dark-accent-primary">
              {{ name() }}
            </h2>
            <app-molecule-badge [name]="_badgeName()" class="block relative top-0.5" />
          </div>
          } @else {
            <app-my-molecule-custom-details [type]="'name'" [value]="name()" (onSave)="doSave($event)" [badgeName]="_badgeName()" />
          }
      } @else {
          <div class="flex gap-6 items-center">
            <h1 id="molecule-name"
                class="text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left text-light-accent-primary dark:text-dark-accent-primary">
              {{ name() }}
            </h1>
            <app-molecule-badge [name]="'ChEMBL Molecule'" />
          </div>
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
  protected readonly _isCustom = signal<boolean>(false)
  protected readonly _badgeName = signal<string>('ChEMBL Personal Molecule')

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

  @Input()
  set isCustom(isCustom: boolean) {
    this._isCustom.set(isCustom ?? false)
    this._badgeName.set(isCustom ? 'Personal Molecule' : 'ChEMBL Personal Molecule')
  }

  @Output()
  onSave = new EventEmitter<MyMoleculeCustomDetailSaveModel>

  doSave(e: MyMoleculeCustomDetailSaveModel): void {
    this.onSave.emit(e)
  }

}
