// ============ MoleculeCollectionItemSelectCardComponent =============
import { Component, ChangeDetectionStrategy, DestroyRef, effect, inject, model, OnDestroy, OnInit, signal, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MoleculeCollectionItemCardComponent } from '../molecule-collection-item-card/molecule-collection-item-card.component';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MoleculeCardItemModel } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { SelectionControlComponent } from '../../common/selection-control/selection-control.component';

@Component({
  selector: 'm-molecule-collection-item-select-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MoleculeCollectionItemCardComponent,
    ReactiveFormsModule,
    SelectionControlComponent
  ],
  host: { class: 'block w-full' },
  template: `
  @if (_molecule() || _isSelectAll()) {
    <div class="grid grid-cols-[28px_1fr] gap-3 items-center w-full">
      <m-selection-control
        [label]="_isSelectAll() ? 'Seleziona tutte le molecole' : 'Seleziona molecola'"
        [indeterminate]="indeterminate()"
        [formControl]="control"
      />

      <!-- colonna 2: card occupa tutto -->
      <div class="min-w-0">
        @if (_isSelectAll()) {
          <span class="block w-full select-none font-semibold ml-[2px]" (click)="toggleSelectAll()" role="button" tabindex="0" (keydown.enter)="toggleSelectAll()" (keydown.space)="toggleSelectAll(); $event.preventDefault()" aria-label="Seleziona tutte le molecole">SELEZIONA TUTTI</span>
        } @else {
          <m-molecule-collection-item-card
            class="block w-full"
            [molecule]="_molecule()!"
            [i]="_i()"
            [isReadonly]="true"
            [attr.aria-label]="'Molecola ' + (_molecule()?.name || '')"
            (click)="toggleValue()" />
        }
      </div>
    </div>
  }
  `
})
export class MoleculeCollectionItemSelectCardComponent implements OnInit, OnDestroy {

  private coSub?: Subscription;
  private readonly destroyRef = inject(DestroyRef);

  readonly indeterminate = input(false);                // per lo stato parziale
  readonly molecule = input<MoleculeCardItemModel | null>(null)
  readonly i = input(-1)
  readonly isSelectAll = input(false)

  readonly selectedAll = output<boolean>();

  control = new FormControl(false, { nonNullable: true });
  value = model<boolean>(false)                 // model input per [(value)]

  _molecule = signal<MoleculeCardItemModel | null>(null);
  _i = signal<number>(-1);
  _isSelectAll = signal<boolean>(false);

  // sync IN: padre -> formcontrol (senza loop)
  syncIn = effect(() => {
    const v = this.value();
    if (this.control.value !== v) {
      this.control.setValue(v, { emitEvent: false });
    }
  });

  private readonly syncInputs = effect(() => {
    this._molecule.set(this.molecule())
    this._i.set(this.i())
    this._isSelectAll.set(this.isSelectAll())
  })

  ngOnInit(): void {
    // sync OUT: formcontrol -> model (e, se select-all, notifica il padre)
    this.coSub = this.control.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(val => {
      this.value.set(val);
      if (this._isSelectAll()) {
        this.selectedAll.emit(val)
      }
    })
  }

  ngOnDestroy(): void {
    this.coSub?.unsubscribe();
  }

  toggleSelectAll(): void {
    // Mirror checkbox behaviour when clicking the label text
    this.control.setValue(!this.control.value);
  }

  toggleValue(): void {
    this.control.setValue(!this.control.value);
  }

}
