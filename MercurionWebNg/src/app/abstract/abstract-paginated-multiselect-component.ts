import { firstValueFrom } from "rxjs";
import { AbstractMultiselectItem } from "../Models/abstract.models";
import { AbstractPaginationComponent } from "./abstract-pagination-component";
import { computed, signal } from "@angular/core";

export abstract class AbstractPaginatedMultiselectComponent<T> extends AbstractPaginationComponent<T> {

  protected multiselectItems = signal<AbstractMultiselectItem<T>[]>([]);

  protected isSelectedAll = computed<boolean>(() => {
    const items = this.multiselectItems();
    if (items.length === 0) return false;
    return items.every(i => i.isChecked());
  });

  protected isSelectedNothing = computed<boolean>(() => {
    const items = this.multiselectItems()
    if (items.length === 0) {
      return true
    }
    return items.every(i => !i.isChecked())
  })

  protected selectAll(): void {
    queueMicrotask(() => {
      this.multiselectItems().forEach(i => i.isChecked.set(true));
    });
  }

  protected unselectAll(): void {
    queueMicrotask(() => {
      this.multiselectItems().forEach(i => i.isChecked.set(false));
    });
  }

  protected toggleSelectAll(): void {
    this.isSelectedAll() ? this.unselectAll() : this.selectAll();
  }

  protected override async loadMore(): Promise<void> {
    if (this.loading || this.done) return;
    this.loading = true;

    const newPage = await firstValueFrom(this.fetch$());

    if (newPage.items.length === 0) {
      this.done = true;
      this.earlyDone = true;
    } else {
      if (this.empty()) this.empty.set(false);

      this.items = [...this.items, ...newPage.items];

      const wrapped: AbstractMultiselectItem<T>[] = newPage.items.map(item => ({
        item,
        isChecked: signal<boolean>(false),
      }));

      this.multiselectItems.update(curr => [...curr, ...wrapped]);

      this.page++;
    }

    this.loading = false;
  }

  protected override resetPagination(): void {
    this.items = []
    this.multiselectItems.set([])
    this.page = 1
    this.done = false
    this.empty.set(true)
    void this.loadMore()
  }

}
