import { Component, effect, EventEmitter, Input, model, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UiMoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { CollectionCardComponent } from '../collection-card/collection-card.component';

@Component({
  selector: 'm-collection-select-card',
  imports: [ReactiveFormsModule, CollectionCardComponent],
  template: `
    <div class="grid grid-cols-[28px_1fr] gap-3 items-center w-full">
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

      <div class="min-w-0">
        @if (_isSelectAll()) {
          <span class="block w-full select-none font-semibold ml-[2px]">SELEZIONA TUTTI</span>
        } @else {
          <m-collection-card
            class="block w-full"
            [collection]="_collection()!"
            [i]="_i()"
            [isReadonly]="true" />
        }
      </div>
    </div>


  `
})
export class CollectionSelectCardComponent implements OnInit, OnDestroy {

  private coSub?: Subscription

  control = new FormControl(false, { nonNullable: true })
  value = model<boolean>(false)
  _collection = signal<UiMoleculeCollection | null>(null)
  _i = signal<number>(-1)
  _isSelectAll = signal<boolean>(false)

  @Input()
  indeterminate = false

  @Input() set collection(c: UiMoleculeCollection) {
    this._collection.set(c)
  }

  @Input()
  set i(i: number) {
    this._i.set(i);
  }

  @Input()
  set isSelectAll(isSelectAll: boolean) {
    this._isSelectAll.set(isSelectAll)
  }

  @Output()
  selectedAll = new EventEmitter<boolean>()

  syncIn = effect(() => {
    const v = this.value()
    if (this.control.value !== v) {
      this.control.setValue(v, { emitEvent: false })
    }
  })

  ngOnInit(): void {
    this.coSub = this.control.valueChanges.subscribe(val => {
      this.value.set(val)
      if (this._isSelectAll()) {
        this.selectedAll.emit(val)
      }
    })
  }

  ngOnDestroy(): void {
    this.coSub?.unsubscribe()
  }




}
