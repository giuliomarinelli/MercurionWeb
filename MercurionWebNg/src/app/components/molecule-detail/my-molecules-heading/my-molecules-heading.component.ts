import { Component, ChangeDetectionStrategy, effect, inject, input, signal, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { LinkModel } from '../../../Models/link.model';
import { Router, RouterLink } from '@angular/router';


@Component({
  selector: 'm-my-molecules-heading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, RouterLink],
  template: `
    <div class="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 items-start sm:items-center sm:justify-start border-b border-slate-300 dark:border-slate-700 pb-6 relative"
      [class.bottom-4]="!compact()">
      <h1 class="min-w-0 [overflow-wrap:anywhere] mt-4 xs:mt-0 font-semibold tracking-wider text-left text-light-accent-secondary dark:text-dark-accent-secondary-hc"
        [ngClass]="compact() ? 'text-2xl md:text-3xl lg:text-[2rem]' : 'text-3xl md:text-4xl lg:text-[2.65rem]'">
        @if (isMyMoleculesPath()) {
          Le mie molecole
        } @else {
          <a class="hover:underline" routerLink="/molecules" aria-label="Vai a Le mie molecole">Le mie molecole</a>
        }
      </h1>
      @if (_breadcrumb().length) {
        <div class="hidden sm:block text-slate-700 dark:text-slate-200 font-light relative top-1"
          [ngClass]="compact() ? 'text-2xl md:text-3xl lg:text-[2rem]' : 'text-3xl md:text-4xl lg:text-[2.65rem]'">
          >
        </div>
        <div class="flex flex-wrap min-w-0 items-center text-sm md:text-base gap-2 sm:gap-3">
          @for (link of _breadcrumb(); track link; let i = $index) {
            <a [routerLink]="link.path" [queryParams]="link.queryParams" class="min-w-0 [overflow-wrap:anywhere] relative top-1 font-light text-slate-700 dark:text-slate-200 hover:underline">{{link.label}}</a>
            @if (i !== _breadcrumb().length - 1) {
              <div class="text-slate-700 dark:text-slate-200 text-xl font-light relative top-1">></div>
            }
          }
        </div>
      }
    </div>
  `
})
export class MyMoleculesHeadingComponent implements OnInit {

  private readonly router = inject(Router)

  _breadcrumb = signal<LinkModel[]>([])
  protected readonly isMyMoleculesPath = signal<boolean>(false)

  readonly breadcrumb = input<LinkModel[]>([])
  readonly compact = input(false)
  private readonly syncBreadcrumb = effect(() => this._breadcrumb.set(this.breadcrumb()))

  ngOnInit(): void {
    this.isMyMoleculesPath.set(this.router.url === '/molecules')
  }

}
