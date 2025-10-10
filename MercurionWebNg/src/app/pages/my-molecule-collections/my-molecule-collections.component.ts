import { Subscription } from 'rxjs';
import { MyMoleculesHeadingComponent } from './../../components/molecule-detail/my-molecules-heading/my-molecules-heading.component';
import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';

@Component({
  selector: 'app-my-molecule-collections',
  imports: [MyMoleculesHeadingComponent],
  template: `

  <section class="max-w-5xl mx-auto p-0 xs:p-4 sm:p-6 md:p-8 space-y-12">
    <app-my-molecules-heading />
    <h1 id="molecule-name"
        class="text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left text-light-accent-primary dark:text-dark-accent-primary">
        Collezioni molecolari
    </h1>
  </section>

  `
})
export class MyMoleculeCollectionsComponent implements OnInit, OnDestroy, AfterViewInit {

  private pageSub?: Subscription
  items: string[] = []
  loading = false
  done = false
  private observer?: IntersectionObserver
  private page = 0

  ngAfterViewInit(): void {

  }

  ngOnInit(): void {

  }

  ngOnDestroy(): void {
    this.pageSub?.unsubscribe()
  }

  async loadMore() {
    if (this.loading || this.done) return;

    this.loading = true;

    // Simulazione fetch (puoi sostituire con una vera API)

    const newItems = Array.from({ length: 10 }, (_, i) => `Elemento ${(this.page * 10) + i + 1}`);

    if (newItems.length === 0) {
      this.done = true;
    } else {
      this.items = [...this.items, ...newItems];
      this.page++;
    }

    this.loading = false;
  }

}
