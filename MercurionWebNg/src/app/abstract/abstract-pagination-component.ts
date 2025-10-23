import { ElementRef, signal } from "@angular/core";
import { firstValueFrom, Observable } from "rxjs";
import { PageModel } from "../Models/graphql/page.model";

export abstract class AbstractPaginationComponent<T> {
  protected sentinel: ElementRef<HTMLDivElement> | undefined
  protected items: T[] = []
  protected loading = false
  protected done = false
  protected earlyDone = false
  protected observer?: IntersectionObserver
  protected page = 1
  protected empty = signal<boolean>(true)
  protected searchTerm = signal<string>('')

  protected abstract fetch$(page?: number, size?: number): Observable<PageModel<T>>

  protected abstract doQuery(q: string): void

  protected abstract doClear(): void

  protected async loadMore(): Promise<void> {
    if (this.loading || this.done) return;

    if (!this.done) {
      this.loading = true;
    }

    const newPage = await firstValueFrom(
      this.fetch$()
    )

    if (newPage.items.length === 0) {
      this.done = true;
      this.earlyDone = true
    } else {
      if (this.empty()) {
        this.empty.set(false)
      }
      this.items = [...this.items, ...newPage.items];
      this.page++;
    }

    this.loading = false;
  }

  protected resetPagination(): void {
    this.items = []
    this.page = 1
    this.done = false
    this.empty.set(false)
    this.loadMore()
  }

  protected query(q: string): void {
    this.searchTerm.set(q)
    this.resetPagination()
  }

  protected clear(): void {
    this.searchTerm.set('')
    this.resetPagination()
  }

  protected startObserver() {
    if (this.observer) this.observer.disconnect();
    this.observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (entry.isIntersecting) this.loadMore();
      },
      { root: null, rootMargin: '0px 0px 500px 0px', threshold: 0 }
    );
    if (this.sentinel) {
      this.observer.observe(this.sentinel.nativeElement as HTMLDivElement);
    }
  }

}
