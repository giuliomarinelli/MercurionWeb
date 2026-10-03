import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface';
import { SimilarItemComponent } from '../similar-item/similar-item.component';
import { SkeletonCollectionCardComponent } from '../../common/skeleton-card-loader/skeleton-card-loader.component';
import { SmoothResizeDirective } from '../../common/smooth-resize/smooth-resize.directive';

@Component({
  selector: 'm-similars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SimilarItemComponent, SkeletonCollectionCardComponent, SmoothResizeDirective],
  host: { class: 'block min-w-0' },
  template: `
    <div mSmoothResize="height" class="overflow-hidden">
      <div class="relative overflow-y-auto min-h-[90px] m-scroll-thin"
        [style.max-height.px]="onlyKnown() ? 181 : 272" role="region"
        aria-label="Molecole simili" [attr.aria-busy]="loading()" style="scrollbar-gutter: stable">
        @if (loading()) {
          @for (i of [0, 1]; track i) {
            <m-skeleton-collection-card [height]="'45px'" />
          }
        } @else if (molecules().length) {
          @for (molecule of molecules(); track molecule; let i = $index) {
            <m-similar-item [molecule]="molecule" [i]="i" />
            @if (i !== molecules().length - 1) {
              <hr class="border-slate-300 dark:border-slate-600" />
            }
          }
        } @else {
          <div class="min-h-[90px] flex items-center justify-center p-3">
            <p class="text-xs xs:text-sm text-center leading-snug whitespace-normal break-words max-w-[32rem]">
              Nessun analogo noto trovato... Deseleziona
              <strong class="block sm:inline font-semibold">Mostra solo composti noti</strong>
              per vedere i lead sperimentali più simili.
            </p>
          </div>
        }
      </div>
    </div>
  `
})
export class SimilarsComponent {
  readonly molecules = input.required<MoleculeSearchResult[]>()
  readonly onlyKnown = input.required<boolean>()
  readonly loading = input(false)
}
