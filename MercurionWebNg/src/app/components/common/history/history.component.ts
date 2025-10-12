import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HistoryService } from '../../../services/history.service';
import { firstValueFrom, Subscription } from 'rxjs';
import { HistoryDTO } from '../../../Models/history.models';


@Component({
  selector: 'app-history',
  imports: [],
  template: `



  `
})
export class HistoryComponent implements OnInit, OnDestroy {

  // ======================= DEPS =======================
  private readonly historyService = inject(HistoryService)
  // ====================================================

  @ViewChild('sentinel', { static: true })
  sentinel!: ElementRef;

  private pageSub?: Subscription
  private inPageSub?: Subscription

  items: HistoryDTO[] = []
  loading = true
  done = false
  private observer?: IntersectionObserver
  protected page = 1

  private startObserver() {
    if (this.observer) this.observer.disconnect();
    this.observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (entry.isIntersecting) this.loadMore();
      },
      { root: null, rootMargin: '0px 0px 500px 0px', threshold: 0 }
    );
    this.observer.observe(this.sentinel.nativeElement);
  }

  async loadMore() {
    if (this.loading || this.done) return;

    this.loading = true;

    const newPage = await firstValueFrom(this.fetchPage$(this.page, 7));
    if (!newPage || newPage.items.length === 0) {
      this.done = true;
    } else {
      this.items = [...this.items, ...newPage.items];
      this.page++;
    }
    this.loading = false;
  }

  ngOnInit(): void {

  }

  ngOnDestroy(): void {
    this.pageSub?.unsubscribe()
    this.inPageSub?.unsubscribe()
  }

}
