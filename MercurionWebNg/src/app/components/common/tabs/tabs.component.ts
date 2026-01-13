import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  input,
} from '@angular/core';

@Component({
  selector: 'm-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="w-full border-b border-slate-200/70 dark:border-slate-700/60"
      role="tablist"
      aria-orientation="horizontal"
    >
      <div class="flex flex-col sm:flex-row sm:flex-wrap gap-y-2 sm:gap-y-2 gap-x-6">
        @for (t of tabs(); let i = $index; track i) {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="i === activeIndex()"
            [attr.aria-controls]="'tab-panel-' + i"
            [class]="tabClass(i)"
            (click)="onClick(i)"
          >
            {{ t }}
          </button>
        }
      </div>
    </div>
  `,
})
export class TabsComponent {
  // inputs signal-based
  tabs = input<string[]>([]);
  activeIndex = input<number>(0);

  @Output() tabChange = new EventEmitter<number>();

  tabClass(i: number): string {
    const active = i === this.activeIndex();

    return [
      // base
      'relative pb-2 text-base font-medium border-b-2',
      'transition-all duration-150',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'focus-visible:ring-light-accent-primary-hq dark:focus-visible:ring-dark-accent-primary',
      // varianti active / inactive
      active
        ? 'text-light-accent-primary-hc dark:text-dark-accent-primary border-light-accent-primary-hq dark:border-dark-accent-primary'
        : 'text-slate-700 dark:text-slate-200 border-transparent hover:text-slate-800 dark:hover:text-slate-50',
    ].join(' ');
  }

  onClick(i: number) {
    if (i === this.activeIndex()) return;
    this.tabChange.emit(i);
  }
}
