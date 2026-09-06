import { Component, ChangeDetectionStrategy, DestroyRef, effect, inject, model, OnDestroy, OnInit, signal, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UiMoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { CollectionCardComponent } from '../collection-card/collection-card.component';

@Component({
  selector: 'm-collection-select-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CollectionCardComponent],
  template: `
    <div class="grid grid-cols-[28px_1fr] gap-3 items-center w-full">
      <label class="relative inline-flex h-5 w-5 items-center justify-center cursor-pointer select-none z-30">
        <input #cb type="checkbox" class="peer sr-only"
               [formControl]="control"
               [indeterminate]="indeterminate()"
               [attr.aria-checked]="indeterminate() ? 'mixed' : control.value"
               [attr.aria-label]="_isSelectAll() ? 'Seleziona tutte le collezioni' : 'Seleziona collezione'"
        />
        <span class="block h-5 w-5 rounded-md border border-slate-300 bg-white dark:bg-slate-800
                     transition-colors peer-checked:bg-emerald-600"></span>
        <svg viewBox="0 0 14 14" fill="none"
             class="pointer-events-none hidden peer-checked:block absolute left-[3px] top-1/2 -translate-y-1/2 size-3.5">
          <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-white"/>
        </svg>
      </label>

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
