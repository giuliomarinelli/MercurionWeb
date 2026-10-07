import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import { NgStyle } from '@angular/common';
import { SkeletonComponent } from '../skeleton/skeleton.component';

@Component({
  selector: 'm-skeleton-collection-card',
  imports: [NgStyle, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-1 md:grid-cols-12 items-center gap-5 sm:gap-4 border rounded-2xl p-4 md:p-5 bg-slate-100 dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-700/60"
      [ngStyle]="{ height: _height() }" aria-hidden="true">
      <div class="md:col-span-8 flex items-start gap-3 min-w-0">
        <div class="hidden sm:block shrink-0"><m-skeleton shape="rect" width="2.25rem" height="2.25rem" /></div>
        <div class="w-full min-w-0 h-6 md:h-7 flex items-center"><m-skeleton class="w-2/3" width="100%" height="1.25rem" /></div>
      </div>
      <div class="md:col-span-4 flex md:justify-end items-center gap-3 md:gap-4">
        <m-skeleton width="7rem" height="1.625rem" />
        <div class="hidden md:block"><m-skeleton width="1rem" height="1rem" /></div>
      </div>
      <div class="md:col-span-12 mt-1 md:mt-0 flex flex-col sm:flex-row gap-6 sm:gap-3 items-start sm:items-center justify-between w-full">
        <m-skeleton width="10rem" height="1rem" />
        @if (!_isReadonly()) {
          <div class="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <m-skeleton shape="rect" width="2.75rem" height="2.75rem" />
            <m-skeleton shape="rect" width="2.75rem" height="2.75rem" />
            <m-skeleton shape="rect" width="9.25rem" height="2.75rem" />
          </div>
        }
      </div>
    </div>
  `
})
export class SkeletonCollectionCardComponent {
  private _index = signal(0);
  _i = this._index;

  _height = signal<string>('auto');
  _isReadonly = signal<boolean>(false);

  readonly i = input(0)
  readonly height = input('auto')
  readonly isReadonly = input(false)
  private readonly syncInputs = effect(() => {
    this._index.set(this.i())
    this._height.set(this.height() || 'auto')
    this._isReadonly.set(this.isReadonly())
  })
}
