import { Component, inject, Input, signal } from '@angular/core';
import { LinkModel } from '../../../Models/link.model';
import { DesignService } from '../../../services/design.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'm-my-molecules-heading',
  imports: [RouterLink],
  template: `

    @if (design.maxBk('sm')()) {
      <h1 class="mt-4 xs:mt-0 relative bottom-4 text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left text-light-accent-secondary dark:text-dark-accent-secondary border-b border-slate-300 dark:border-slate-700 pb-6">
        <a class="hover:underline" routerLink="/molecules/all-my-molecules" aria-label="Vai a Le mie molecole">Le mie molecole</a>
      </h1>
    } @else {
      <div class="flex flex-wrap gap-4 items-center sm:justify-start border-b border-slate-300 dark:border-slate-700 pb-6 relative bottom-4">
        <h1 class="shrink-0 mt-4 xs:mt-0 text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left text-light-accent-secondary dark:text-dark-accent-secondary">
          <a class="hover:underline" routerLink="/molecules/all-my-molecules" aria-label="Vai a Le mie molecole">Le mie molecole</a>
        </h1>
          @if (_breadcrumb().length) {
            <div class="text-slate-400 dark:text-slate-700 text-3xl md:text-4xl lg:text-[2.65rem] font-light relative top-1">
              >
            </div>
            <div class="flex flex-wrap items-center text-sm md:text-base gap-3">
              @for (link of _breadcrumb(); track link; let i = $index) {
                <a [routerLink]="link.path" [queryParams]="link.queryParams" class="shrink-0 relative top-1 font-light text-slate-700 dark:text-neutral-400   hover:underline">{{link.label}}</a>
                @if (i !== _breadcrumb().length - 1) {
                  <div class="text-slate-400 dark:text-slate-700 text-xl font-light relative top-1">
                    >
                  </div>
                }
              }
            </div>

          }
      </div>
    }
  `
})
export class MyMoleculesHeadingComponent {

  // ======================= DEPS =======================
  protected readonly design = inject(DesignService)
  // ====================================================

  _breadcrumb = signal<LinkModel[]>([])

  @Input()
  set breadcrumb(breadcrumb: LinkModel[]) {
    this._breadcrumb.set(breadcrumb)
  }

}
