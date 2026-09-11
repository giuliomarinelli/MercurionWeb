import { Component, ChangeDetectionStrategy, DestroyRef, effect, inject, model, OnDestroy, OnInit, signal, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UiMoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { CollectionCardComponent } from '../collection-card/collection-card.component';
import { SelectionControlComponent } from '../../common/selection-control/selection-control.component';

@Component({
  selector: 'm-collection-select-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CollectionCardComponent, SelectionControlComponent],
  template: `
    <div class="grid grid-cols-[28px_1fr] gap-3 items-center w-full">
      <m-selection-control
        [label]="_isSelectAll() ? 'Seleziona tutte le collezioni' : 'Seleziona collezione'"
        [indeterminate]="indeterminate()"
        [formControl]="control"
      />

      <div class="min-w-0">
        @if (_isSelectAll()) {
          <span class="block w-full select-none font-semibold ml-[2px]" (click)="toggleSelectAll()" role="button" tabindex="0" aria-label="Seleziona tutte le collezioni" (keydown.enter)="toggleSelectAll()" (keydown.space)="toggleSelectAll(); $event.preventDefault()">SELEZIONA TUTTI</span>
        } @else {
          <m-collection-card
            class="block w-full"
            [collection]="_collection()!"
            [i]="_i()"
            [isReadonly]="true"
            [attr.aria-label]="'Collezione ' + (_collection()?.name || '')"
            (click)="toggleValue()" />
        }
      </div>
    </div>


  `
})
export class CollectionSelectCardComponent implements OnInit, OnDestroy {

  private coSub?: Subscription
  private readonly destroyRef = inject(DestroyRef)

  control = new FormControl(false, { nonNullable: true })
  value = model<boolean>(false)
  _collection = signal<UiMoleculeCollection | null>(null)
  _i = signal<number>(-1)
  _isSelectAll = signal<boolean>(false)

  readonly indeterminate = input(false);

  readonly collection = input<UiMoleculeCollection | null>(null)
  readonly i = input(-1)
  readonly isSelectAll = input(false)

  readonly selectedAll = output<boolean>();

  syncIn = effect(() => {
    const v = this.value()
    if (this.control.value !== v) {
      this.control.setValue(v, { emitEvent: false })
    }
  })

  private readonly syncInputs = effect(() => {
    this._collection.set(this.collection())
    this._i.set(this.i())
    this._isSelectAll.set(this.isSelectAll())
  })

  ngOnInit(): void {
    this.coSub = this.control.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(val => {
      this.value.set(val)
      if (this._isSelectAll()) {
        this.selectedAll.emit(val)
      }
    })
  }

  ngOnDestroy(): void {
    this.coSub?.unsubscribe()
  }

  toggleSelectAll(): void {
    this.control.setValue(!this.control.value)
  }

  toggleValue(): void {
    this.control.setValue(!this.control.value)
  }




}
