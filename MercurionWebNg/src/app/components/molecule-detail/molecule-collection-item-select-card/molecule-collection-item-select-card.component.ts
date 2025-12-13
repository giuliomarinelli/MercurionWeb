// ============ MoleculeCollectionItemSelectCardComponent =============
import { Component, effect, EventEmitter, Input, model, OnDestroy, OnInit, Output, signal, ViewChild, ElementRef } from '@angular/core';
import { MoleculeCollectionItemCardComponent } from '../molecule-collection-item-card/molecule-collection-item-card.component';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MoleculeCardItemModel } from '../../../Models/graphql/molecule-collection/molecule-collection.types';

@Component({
  selector: 'm-molecule-collection-item-select-card',
  imports: [
    MoleculeCollectionItemCardComponent,
    ReactiveFormsModule
  ],
  host: { class: 'block w-full' },
  template: `
  @if (_molecule() || _isSelectAll()) {
    <div class="grid grid-cols-[28px_1fr] gap-3 items-center w-full">
      <!-- colonna 1: checkbox -->
      <label class="relative inline-flex h-5 w-5 items-center justify-center cursor-pointer select-none z-30">
        <input #cb type="checkbox" class="peer sr-only"
               [formControl]="control"
               [indeterminate]="indeterminate" />
        <span class="block h-5 w-5 rounded-md border border-slate-300 bg-white dark:bg-slate-800
                     transition-colors peer-checked:bg-emerald-600"></span>
        <svg viewBox="0 0 14 14" fill="none"
             class="pointer-events-none hidden peer-checked:block absolute left-[3px] top-1/2 -translate-y-1/2 size-3.5">
          <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-white"/>
        </svg>
      </label>

      <!-- colonna 2: card occupa tutto -->
      <div class="min-w-0">
        @if (_isSelectAll()) {
          <span class="block w-full select-none font-semibold ml-[2px]" (click)="toggleSelectAll()">SELEZIONA TUTTI</span>
        } @else {
          <m-molecule-collection-item-card
            class="block w-full"
            [molecule]="_molecule()!"
            [i]="_i()"
            [isReadonly]="true"
            (click)="toggleValue()" />
        }
      </div>
    </div>
  }
  `
})
export class MoleculeCollectionItemSelectCardComponent implements OnInit, OnDestroy {

  private coSub?: Subscription;

  @Input() indeterminate = false;                // per lo stato parziale
  @Input() set molecule(m: MoleculeCardItemModel) { this._molecule.set(m); }
  @Input() set i(i: number) { this._i.set(i); }
  @Input() set isSelectAll(isSelectAll: boolean) { this._isSelectAll.set(isSelectAll); }

  @Output() selectedAll = new EventEmitter<boolean>();

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

  ngOnInit(): void {
    // sync OUT: formcontrol -> model (e, se select-all, notifica il padre)
    this.coSub = this.control.valueChanges.subscribe(val => {
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
