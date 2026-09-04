// ================== AbstractPaginationComponent ==================
import { ElementRef, signal } from "@angular/core";
import { firstValueFrom, Observable } from "rxjs";
import { PageModel } from "../Models/graphql/page.models";
import { BrowserResourceOwner, injectBrowserResourceOwner } from "../utils/browser-resource-owner.util";

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

  /**
   * Owns every RAF this base class schedules and is disposed automatically
   * on the owning component/directive's destruction (via `DestroyRef`), so a
   * destroyed pagination component can never receive a later scheduled
   * callback (e.g. a "prime fetch" RAF firing after teardown).
   */
  protected readonly resources: BrowserResourceOwner = injectBrowserResourceOwner();

  protected abstract fetch$(): Observable<PageModel<T>>
  protected abstract fetch$(page?: number, size?: number, q?: string, excludeJoinedToCollection?: boolean, collectionId?: boolean): Observable<PageModel<T>>;

  protected abstract doQuery(q: string): void;
  protected abstract doClear(): void;

  /**
   * Disconnects the shared IntersectionObserver. This is intentionally NOT
   * named `ngOnDestroy` so it is never mistaken by the Angular compiler for a
   * lifecycle hook on this undecorated abstract base class (NG2007). Subclasses
   * that declare their own ngOnDestroy must call super.disposePaginationResources()
   * to inherit this cleanup (Angular does not chain lifecycle hooks automatically).
   */
  protected disposePaginationResources(): void {
    this.observer?.disconnect();
  }

  protected async loadMore(): Promise<void> {
    if (this.loading || this.done) return;
    this.loading = true;

    const newPage = await firstValueFrom(this.fetch$());

    if (newPage.items.length === 0) {
      this.done = true;
      if (this.page === 1) {
        this.earlyDone = true;
      }
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
    this.loading = false;
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
    this.resources.requestAnimationFrame(() => {
      if (!this.sentinel) return;
      this.observer!.observe(this.sentinel.nativeElement);
    });

    // Prime fetch se il contenuto non riempie il container (niente scroll -> niente intersect)
    this.resources.requestAnimationFrame(() => {
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
