import { Component, EventEmitter, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'm-search-type-selector',
  imports: [ReactiveFormsModule],
  template: `

      <div class="space-y-6 sm:flex sm:items-center sm:space-x-10 sm:space-y-0">
        <div class="flex items-center" (change)="handleViewSwitch()">
          <input id="my" type="radio" name="method" value="my" [formControl]="viewCtrl" class="cursor-pointer relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 dark:border-white/10 dark:bg-white/5 dark:checked:border-indigo-500 dark:checked:bg-indigo-500 dark:focus-visible:outline-indigo-500 dark:disabled:border-white/5 dark:disabled:bg-white/10 dark:disabled:before:bg-white/20 forced-colors:appearance-auto forced-colors:before:hidden [&:not(:checked)]:before:hidden" />
          <label for="my" class="cursor-pointer ml-3 block text-sm/6 font-medium text-gray-900 dark:text-white">Cerca in <span class="italic">Le mie molecole</span></label>
        </div>
        <div class="flex items-center" (change)="handleViewSwitch()">
          <input id="chembl" type="radio" name="method" value="chembl" [formControl]="viewCtrl" class="cursor-pointer relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 dark:border-white/10 dark:bg-white/5 dark:checked:border-indigo-500 dark:checked:bg-indigo-500 dark:focus-visible:outline-indigo-500 dark:disabled:border-white/5 dark:disabled:bg-white/10 dark:disabled:before:bg-white/20 forced-colors:appearance-auto forced-colors:before:hidden [&:not(:checked)]:before:hidden" />
          <label for="chembl" class="cursor-pointer ml-3 block text-sm/6 font-medium text-gray-900 dark:text-white">Cerca su ChEMBL DB</label>
        </div>
      </div>

  `
})
export class SearchTypeSelectorComponent {

  @Output()
  onViewClick = new EventEmitter<'my' | 'chembl'>()

  viewCtrl = new FormControl<'my' | 'chembl'>('chembl', { nonNullable: true })

  handleViewSwitch(): void {
    this.onViewClick.emit(this.viewCtrl.value)
  }

}
