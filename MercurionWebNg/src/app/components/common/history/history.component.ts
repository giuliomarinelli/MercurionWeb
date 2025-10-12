import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HistoryService } from '../../../services/history.service';
import { debounce, distinctUntilChanged, filter, firstValueFrom, interval, Subscription } from 'rxjs';
import { HistoryDTO } from '../../../Models/history.models';
import { NavigationEnd, Router } from '@angular/router';
import { HistoryItemComponent } from '../history-item/history-item.component';
import { ClassicSpinnerComponent } from '../classic-spinner/classic-spinner.component';


@Component({
  selector: 'app-history',
  imports: [HistoryItemComponent, ClassicSpinnerComponent],
  template: `

    @for (item of items; track item) {
      <app-history-item [historyDTO]="item" class="block" />
    }
    @if (!items.length) {
      <p class="text-xs opacity-60 px-2 py-4">Nessuna attività recente.</p>
    }
    <div #sentinel id="sentinel"></div>
    @if (loading || page === 1) {
      <div class="flex justify-center pt-8">
        <app-classic-spinner [size]="30" />
      </div>
    }

  `
})
export class HistoryComponent implements OnInit, OnDestroy, AfterViewInit {

  // ======================= DEPS =======================
  private readonly historyService = inject(HistoryService)
  private readonly router = inject(Router)
  // ====================================================

  @ViewChild('sentinel', { static: true })
  sentinel!: ElementRef;

  private rSub?: Subscription


  items: HistoryDTO[] = []
  loading = false
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

    const newPage = await firstValueFrom(
      this.historyService.getHistory(this.page, 25).pipe(
        debounce(() => interval(80)),
        distinctUntilChanged()
      )
    )
    if (!newPage || newPage.items.length === 0) {
      this.done = true;
    } else {
      this.items = [...this.items, ...newPage.items];
      this.page++;
    }
    this.loading = false;
  }

  ngOnInit(): void {
    this.rSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.page === 1) {
        this.loadMore()
      }
    })
  }

  ngAfterViewInit(): void {
    this.startObserver()
  }

  ngOnDestroy(): void {
    this.rSub?.unsubscribe()
  }

}
