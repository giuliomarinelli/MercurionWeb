import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

export type TabsOrientation = 'horizontal' | 'vertical';

@Component({
  selector: 'm-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="w-full border-b border-slate-200/70 dark:border-slate-700/60"
      role="tablist"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-orientation]="orientation()"
      (keydown)="onKeydown($event)"
    >
      <div [class]="listClass()">
        @for (tab of normalizedTabs(); let i = $index; track tab.id) {
          <button
            type="button"
            role="tab"
            [id]="tabId(tab, i)"
            [attr.aria-selected]="i === activeIndex()"
            [attr.aria-controls]="panelId(tab, i)"
            [attr.aria-disabled]="tab.disabled ? 'true' : null"
            [disabled]="tab.disabled"
            [tabIndex]="i === activeIndex() ? 0 : -1"
            [class]="tabClass(i)"
            (click)="select(i)"
          >
            {{ tab.label }}
          </button>
        }
      </div>
    </div>
  `,
})
export class TabsComponent {
  readonly tabs = input<readonly (string | TabItem)[]>([]);
  readonly activeIndex = input(0);
  readonly orientation = input<TabsOrientation>('horizontal');
  readonly ariaLabel = input('Tabs');
  readonly idPrefix = input('m-tabs');

  readonly tabChange = output<number>();

  protected readonly normalizedTabs = computed<TabItem[]>(() =>
    this.tabs().map((tab, index) =>
      typeof tab === 'string'
        ? { id: `tab-${index}`, label: tab }
        : tab,
    ),
  );

  protected readonly listClass = computed(() =>
    this.orientation() === 'vertical'
      ? 'flex flex-col gap-y-2'
      : 'flex flex-col sm:flex-row sm:flex-wrap gap-y-2 gap-x-6',
  );

  tabId(tab: TabItem, index: number): string {
    return `${this.idPrefix()}-${tab.id || index}-tab`;
  }

  panelId(tab: TabItem, index: number): string {
    return `${this.idPrefix()}-${tab.id || index}-tabpanel`;
  }

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

  select(i: number): void {
    const tab = this.normalizedTabs()[i];
    if (!tab || tab.disabled || i === this.activeIndex()) return;
    this.tabChange.emit(i);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const tabs = this.normalizedTabs();
    if (!tabs.length) return;

    const previous = this.orientation() === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
    const next = this.orientation() === 'vertical' ? 'ArrowDown' : 'ArrowRight';
    let target = -1;

    if (event.key === previous || event.key === next) {
      event.preventDefault();
      const direction = event.key === next ? 1 : -1;
      target = this.findEnabled(this.activeIndex() + direction, direction);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      target = this.findEnabled(
        event.key === 'Home' ? 0 : tabs.length - 1,
        event.key === 'Home' ? 1 : -1,
      );
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.select(this.activeIndex());
      return;
    }

    if (target >= 0) {
      this.tabChange.emit(target);
      const tablist = event.currentTarget as HTMLElement | null;
      queueMicrotask(() => {
        const button = tablist?.querySelector<HTMLElement>(
          `#${CSS.escape(this.tabId(tabs[target], target))}`,
        );
        button?.focus();
      });
    }
  }

  private findEnabled(start: number, direction: 1 | -1): number {
    const tabs = this.normalizedTabs();
    for (let offset = 0; offset < tabs.length; offset++) {
      const index = (start + offset * direction + tabs.length) % tabs.length;
      if (!tabs[index].disabled) return index;
    }
    return -1;
  }
}
