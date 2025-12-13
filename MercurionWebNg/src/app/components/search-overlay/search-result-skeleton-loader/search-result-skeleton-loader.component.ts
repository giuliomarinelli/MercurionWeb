import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'm-search-result-skeleton-loader',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `

    <div class="space-y-3">
      @for (i of [0, 1, 2, 3, 4]; track i) {
        <div class="flex items-center gap-3 p-3 rounded-lg animate-pulse bg-slate-200 my-1">
          <div class="w-12 h-12 bg-slate-300 rounded-lg"></div>
          <div class="flex-1 min-w-0">
            <div class="h-4 bg-slate-300 rounded w-2/3 mb-2"></div>
            <div class="h-3 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
        }
     </div>

  `
})
export class SearchResultSkeletonLoaderComponent {

}
