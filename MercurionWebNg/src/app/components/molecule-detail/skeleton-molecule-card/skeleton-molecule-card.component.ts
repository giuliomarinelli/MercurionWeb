import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SkeletonComponent } from '../../common/skeleton/skeleton.component';

@Component({
  selector: 'm-skeleton-molecule-card',
  imports: [SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  styleUrl: '../molecule-summary-card/molecule-summary-card.component.css',
  template: `
    <div class="m-summary-card relative grid items-center gap-3 overflow-hidden rounded-2xl border p-4"
      [class.m-summary-card--compact]="compact()" [style.height]="height()"
      role="status" aria-label="Caricamento dati molecola" aria-busy="true">
      <div class="min-w-0" [class.order-2]="compact()">
        <div class="m-summary-card__heading gap-2">
          <div class="m-summary-card__name"><m-skeleton width="80%" height="1rem" /></div>
          <m-skeleton width="3.5rem" height="1.5rem" />
        </div>
        <div class="m-summary-card__synonym"><m-skeleton width="60%" height="0.75rem" /></div>
        <div class="m-summary-card__metrics mt-2 flex items-center gap-2">
          <m-skeleton width="4rem" height="1.5rem" /><m-skeleton width="3rem" height="1.5rem" />
        </div>
        @if (selectionHint()) { <p class="mt-2 text-xs"><m-skeleton width="8rem" height="1rem" /></p> }
      </div>
      <div class="m-summary-card__viewer relative overflow-hidden rounded-xl border" [class.order-1]="compact()">
        <m-skeleton shape="rect" width="100%" height="100%" />
      </div>
      @if (!compact() && footer()) {
        <div class="m-summary-card__footer mt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
          <m-skeleton width="5rem" height="1rem" />
          <div class="m-summary-card__actions flex flex-wrap gap-3"><div class="m-summary-card__action"><m-skeleton width="1rem" height="1rem" /></div><div class="m-summary-card__action"><m-skeleton width="1rem" height="1rem" /></div>@if (removeAction()) { <div class="m-summary-card__action m-summary-card__action--remove"><m-skeleton width="10rem" height="1rem" /></div> }</div>
        </div>
      }
      <span class="sr-only">Caricamento molecola…</span>
    </div>
  `
})
export class SkeletonMoleculeCardComponent {
  readonly i = input(0);
  readonly height = input<string | null>('auto');
  readonly compact = input(false);
  readonly footer = input(true);
  readonly removeAction = input(false);
  readonly selectionHint = input(false);
}
