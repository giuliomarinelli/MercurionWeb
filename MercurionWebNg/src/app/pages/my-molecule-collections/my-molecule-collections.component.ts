import { MoleculeCollection } from './../../Models/graphql/molecule-collection/molecule-collection.types';
import { debounce, firstValueFrom, interval, Subscription } from 'rxjs';
import { MyMoleculesHeadingComponent } from './../../components/molecule-detail/my-molecules-heading/my-molecules-heading.component';
import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MoleculeCollectionService } from '../../services/graphql/molecule-collection.service';
import { PageModel } from '../../Models/graphql/page.model';
import { CollectionCardComponent } from '../../components/molecule-detail/collection-card/collection-card.component';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';

@Component({
  selector: 'app-my-molecule-collections',
  imports: [MyMoleculesHeadingComponent, CollectionCardComponent, ClassicSpinnerComponent],
  template: `

  <section class="max-w-5xl mx-auto p-0 xs:p-4 sm:p-6 md:p-8 space-y-12">
    <app-my-molecules-heading />
    <h2 class="text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left text-light-accent-primary dark:text-dark-accent-primary mb-2" style="margin-block-start: 0">
        Collezioni molecolari
    </h2>
    <div class="mb-2"></div>
    @for (item of items; track item; let i = $index) {
      <app-collection-card [collection]="item" [i]="i" />
    }
    <div #sentinel class="sentinel"></div>
    @if (loading) {
      <div class="flex justify-center">
        <app-classic-spinner [size]="60" />
      </div>
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
  private page = 1

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (entry.isIntersecting) this.loadMore();
      },
      { root: null, rootMargin: '0px 0px 200px 0px', threshold: 0 }
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
      this.moleculeCollectionService.getPaginatedCollections(this.page, 6)
        .pipe(
          debounce(() => interval(200))
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
