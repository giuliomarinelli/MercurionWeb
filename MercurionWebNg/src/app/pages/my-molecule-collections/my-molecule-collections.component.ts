import { MoleculeCollection } from './../../Models/graphql/molecule-collection/molecule-collection.types';
import { debounce, firstValueFrom, interval, Subscription } from 'rxjs';
import { MyMoleculesHeadingComponent } from './../../components/molecule-detail/my-molecules-heading/my-molecules-heading.component';
import { AfterViewInit, Component, computed, effect, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MoleculeCollectionService } from '../../services/graphql/molecule-collection.service';
import { CollectionCardComponent } from '../../components/molecule-detail/collection-card/collection-card.component';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { SkeletonCollectionCardComponent } from '../../components/common/skeleton-card-loader/skeleton-card-loader.component';

@Component({
  selector: 'app-my-molecule-collections',
  imports: [
    MyMoleculesHeadingComponent,
    CollectionCardComponent,
    ClassicSpinnerComponent,
    SkeletonCollectionCardComponent
  ],
  template: `

  <section class="max-w-5xl mx-auto p-0 xs:p-4 sm:p-6 md:p-8 space-y-12">
    <app-my-molecules-heading />
    <h2 class="bg-slate-50 dark:bg-neutral-950 z-10 block sticky top-0 bottom-5 text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left text-light-accent-primary dark:text-dark-accent-primary pt-2 pb-8" style="margin-block-start: 0">
        Collezioni molecolari
    </h2>
    <div class="mt-px relative bottom-10">
      @for (item of items; track item; let i = $index) {
        <app-collection-card [collection]="item" [i]="i" />
      }
    </div>
    <div #sentinel class="sentinel"></div>
    @if (loading) {
      @if (page > 1) {
        <div class="flex justify-center">
          <app-classic-spinner [size]="60" />
        </div>
      } @else {
        <div class="relative bottom-10">
          @for (i of [0, 1, 2, 3, 4]; track i) {
            <app-skeleton-collection-card />
          }
        </div>
      }
    }
  </section>

  `
})
export class MyMoleculeCollectionsComponent implements OnInit, OnDestroy, AfterViewInit {

  // ======================= DEPS =======================
  private readonly moleculeCollectionService = inject(MoleculeCollectionService)
  // ====================================================



  @ViewChild('sentinel', { static: true })
  sentinel!: ElementRef;

  private pageSub?: Subscription
  items: MoleculeCollection[] = []
  loading = false
  done = false
  private observer?: IntersectionObserver
  protected page = 1





  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (entry.isIntersecting) this.loadMore();
      },
      { root: null, rootMargin: '0px 0px 500px 0px', threshold: 0 }
    );

    this.observer.observe(this.sentinel.nativeElement);
  }

  ngOnInit(): void {
    this.loadMore()
  }

  ngOnDestroy(): void {
    this.pageSub?.unsubscribe()
  }

  async loadMore() {
    if (this.loading || this.done) return;

    if (!this.done) {
      this.loading = true;
    }

    const newPage = await firstValueFrom(
      this.moleculeCollectionService.getPaginatedCollections(this.page, 10)
        .pipe(
          debounce(() => interval(80))
        )
    )

    if (newPage.items.length === 0) {
      this.done = true;
    } else {
      this.items = [...this.items, ...newPage.items];
      this.page++;
    }

    this.loading = false;
  }

}
