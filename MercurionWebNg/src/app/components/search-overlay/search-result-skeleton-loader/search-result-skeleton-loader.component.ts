import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonComponent } from '../../common/skeleton/skeleton.component';

@Component({
  selector: 'm-search-result-skeleton-loader',
  imports: [SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `

    <div class="space-y-3">
      @for (i of [0, 1, 2, 3, 4]; track i) {
        <div class="flex items-center gap-3 p-3 rounded-lg my-1">
          <m-skeleton shape="rect" width="3rem" height="3rem" />
          <div class="flex-1 min-w-0">
            <m-skeleton width="66.666667%" height="1rem" />
            <m-skeleton width="50%" height=".75rem" />
          </div>
        </div>
        }
     </div>
    <span class="sr-only">Caricamento risultati della ricerca...</span>
  `
})
export class SearchResultSkeletonLoaderComponent {

}
