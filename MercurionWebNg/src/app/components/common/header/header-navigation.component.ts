import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeaderNavigationItem } from './header.models';

@Component({
  selector: 'm-header-navigation',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Navigazione principale">
      <ng-content />
      @for (item of items(); track item.url) {
        <a [routerLink]="item.url"
           [attr.aria-current]="item.active ? 'page' : null"
           (click)="selected.emit(item)"
           class="sr-only">{{ item.label }}</a>
      }
    </nav>
  `
})
export class HeaderNavigationComponent {
  readonly items = input<readonly HeaderNavigationItem[]>([]);
  readonly selected = output<HeaderNavigationItem>();
}
