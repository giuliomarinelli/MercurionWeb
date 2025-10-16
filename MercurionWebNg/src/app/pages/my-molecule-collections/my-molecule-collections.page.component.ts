import { MoleculeCollection } from '../../Models/graphql/molecule-collection/molecule-collection.types';
import { debounce, firstValueFrom, interval, Subscription } from 'rxjs';
import { MyMoleculesHeadingComponent } from '../../components/molecule-detail/my-molecules-heading/my-molecules-heading.component';
import { AfterViewInit, Component, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { MoleculeCollectionService } from '../../services/graphql/molecule-collection.service';
import { CollectionCardComponent } from '../../components/molecule-detail/collection-card/collection-card.component';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { SkeletonCollectionCardComponent } from '../../components/common/skeleton-card-loader/skeleton-card-loader.component';
import { RouterLink } from '@angular/router';


@Component({
  selector: 'app-my-molecule-collections',
  imports: [
    MyMoleculesHeadingComponent,
    CollectionCardComponent,
    ClassicSpinnerComponent,
    SkeletonCollectionCardComponent,
    RouterLink
],
  template: `

  <section class="max-w-5xl mx-auto p-0 xs:p-4 sm:p-6 md:p-8 space-y-12">
    <app-my-molecules-heading />
    <h2 class="bg-slate-50 dark:bg-neutral-950 z-10 block sticky top-0 bottom-5 text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left text-light-accent-primary dark:text-dark-accent-primary pt-2 pb-8" style="margin-block-start: 0">
        Collezioni molecolari
    </h2>
    @if (empty()) {
      <p class="mt-5 text-slate-700 dark:text-slate-200">Nessuna collezione molecolare.</p>
    } @else {
      <div class="flex gap-2 items-center flex-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-8 h-auto relative -top-2">
          <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path d="M296.5 153.7C268.2 123 314.7 79.6 343.4 110.1C395.3 166.7 479.5 256.1 528.4 302C544.6 317.7 544.4 343.6 528.4 359.3C517.9 369.6 499.6 387.7 494.2 394.1C448.6 448.2 388.1 485.8 344.3 536.7C332.8 550.1 312.6 551.7 299.2 540.3C257.6 499.5 349.3 448.3 372.4 421.9C398.9 399.3 423.7 378 444.4 353.8C432 353.5 419.6 353.7 406.7 354C325.8 354.2 244.1 356.1 162.3 355.5C136.2 356.8 94.8 360.6 96 321.8C97.9 289.9 132.6 290.7 157.9 291.6C239.4 292.1 320.7 290.4 403.1 290.1C410 289.9 417.2 289.8 424.8 289.7C376.2 241.2 341.3 201.2 296.4 153.7z"/>
        </svg>
        <a class="a relative -top-2" routerLink="/molecules/all-my-molecules">Mostra tutte le mie molecole in un unico raggruppamento</a>
      </div>
    }
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
export class MyMoleculeCollectionsPageComponent implements OnInit, AfterViewInit {

  // ======================= DEPS =======================
  private readonly moleculeCollectionService = inject(MoleculeCollectionService)
  // ====================================================



  @ViewChild('sentinel', { static: true })
  sentinel!: ElementRef;


  items: MoleculeCollection[] = []
  loading = false
  done = false
  private observer?: IntersectionObserver
  protected page = 1

  empty = signal<boolean>(false)



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
      if (this.page === 1) {
        this.empty.set(true)
      }
      this.done = true;
    } else {
      this.items = [...this.items, ...newPage.items];
      this.page++;
    }

    this.loading = false;
  }

}
