// ================== AbstractPaginationComponent ==================
import { ElementRef, signal } from "@angular/core";
import { firstValueFrom, Observable } from "rxjs";
import { PageModel } from "../Models/graphql/page.model";

export abstract class AbstractPaginationComponent<T> {
  protected sentinel: ElementRef<HTMLDivElement> | undefined;
  protected items: T[] = [];
  protected loading = false;
  protected done = false;
  protected earlyDone = false;
  protected observer?: IntersectionObserver;
  protected page = 1;
  protected empty = signal<boolean>(true);
  protected searchTerm = signal<string>('');
  protected root: ElementRef | null = null;

  protected abstract fetch$(page?: number, size?: number, q?: string, excludeJoinedToCollection?: boolean, collectionId?: boolean): Observable<PageModel<T>>;
  protected abstract doQuery(q: string): void;
  protected abstract doClear(): void;

  protected async loadMore(): Promise<void> {
    if (this.loading || this.done) return;
    this.loading = true;

    const newPage = await firstValueFrom(this.fetch$());

    if (newPage.items.length === 0) {
      this.done = true;
      if (this.page === 1) {
        this.earlyDone = true;
      } else {
        if (this.empty()) this.empty.set(false);
        this.items = [...this.items, ...newPage.items];
        this.page++;
      }

      this.loading = false;
    }

  protected resetPagination(): void {
    this.items = [];
    this.page = 1;
    this.done = false;
    this.earlyDone = false;
    this.empty.set(true);
    void this.loadMore();

    // Re-attach dopo il reset (nuovo layout)
    queueMicrotask(() => this.startObserver());
  }

  protected query(q: string): void {
    this.searchTerm.set(q);
    this.resetPagination();
  }

  protected clear(): void {
    this.searchTerm.set('');
    this.resetPagination();
  }

  /** Idempotente e robusto a layout dinamici (switch di step, skeleton, ecc.) */
  protected startObserver(bottomPx: number = 500): void {
    if (!this.sentinel) return;

    const rootEl = this.root?.nativeElement ?? null;

    // Stacca l'eventuale precedente
    this.observer?.disconnect();

    const opts: IntersectionObserverInit = {
      root: rootEl,
      rootMargin: `0px 0px ${bottomPx}px 0px`,
      threshold: 0
    };

    this.observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting) this.loadMore();
    }, opts);

    // Osserva quando il DOM è misurabile
    requestAnimationFrame(() => {
      if (!this.sentinel) return;
      this.observer!.observe(this.sentinel.nativeElement);
    });

    // Prime fetch se il contenuto non riempie il container (niente scroll -> niente intersect)
    requestAnimationFrame(() => {
      if (this.loading || this.done) return;

      if (rootEl instanceof HTMLElement) {
        const notEnoughContent = rootEl.scrollHeight <= rootEl.clientHeight + 1;
        if (notEnoughContent) this.loadMore();
        return;
      }

      if (typeof window === 'undefined' || typeof document === 'undefined') return;

      const docEl = document.documentElement ?? document.body;
      if (!docEl) return;

      const viewportHeight = window.innerHeight || docEl.clientHeight;
      const contentHeight = Math.max(
        docEl.scrollHeight,
        document.body?.scrollHeight ?? 0
      );

      if (contentHeight <= viewportHeight + 1) {
        this.loadMore();
      }
    });
  }
}
