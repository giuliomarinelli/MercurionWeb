// ================== AbstractPaginatedMultiselectComponent ==================
import { computed, effect, signal } from "@angular/core";
import { AbstractMultiselectItem } from "../Models/abstract.models";
import { AbstractPaginationComponent } from "./abstract-pagination-component";
import { firstValueFrom } from "rxjs";
import { PageModel } from "../Models/graphql/page.model";

export abstract class AbstractPaginatedMultiselectComponent<T> extends AbstractPaginationComponent<T> {

  protected multiselectItems = signal<AbstractMultiselectItem<T>[]>([]);

  // ricorda l’ultima intenzione "bulk"
  protected lastBulkAction = signal<'none' | 'all' | 'unselect'>('none');

  protected isSelectedAll = computed<boolean>(() => {
    const items = this.multiselectItems();
    if (items.length === 0) return false;
    return items.every(i => i.isChecked());
  });

  protected isSelectedNothing = computed<boolean>(() => {
    const items = this.multiselectItems();
    if (items.length === 0) return true;
    return items.every(i => !i.isChecked());
  });

  // utile per UI indeterminate
  protected isPartiallySelected = computed<boolean>(() =>
    !this.isSelectedNothing() && !this.isSelectedAll()
  );

  // se lo stato diventa parziale, “dimentica” l’ultima azione massiva
  private _clearBulkOnPartial = effect(() => {
    if (this.isPartiallySelected() && this.lastBulkAction() !== 'none') {
      this.lastBulkAction.set('none');
    }
  });

  protected selectAll(): void {
    this.lastBulkAction.set('all');
    queueMicrotask(() => {
      this.multiselectItems().forEach(i => i.isChecked.set(true));
    });
  }

  protected unselectAll(): void {
    this.lastBulkAction.set('unselect');
    queueMicrotask(() => {
      this.multiselectItems().forEach(i => i.isChecked.set(false));
    });
  }

  protected toggleSelectAll(): void {
    this.isSelectedAll() ? this.unselectAll() : this.selectAll();
  }

  protected onSelectAllChange(checked: boolean): void {
    if (checked) {
      this.selectAll()
    } else {
      this.unselectAll()
    }
  }

  // 👇 qui propaghiamo il bulk ai nuovi item
  protected override async loadMore(): Promise<void> {
    if (this.loading || this.done) return;
    this.loading = true;

    const newPage: PageModel<T> = await firstValueFrom(this.fetch$());

    if (newPage.items.length === 0) {
      this.done = true;
      this.earlyDone = true;
    } else {
      if (this.empty()) this.empty.set(false);

      // iniziale per i nuovi item:
      // - 'all'      => true
      // - 'unselect' => false
      // - 'none'     => stato reale corrente (se tutti selezionati, allora true)
      const intent = this.lastBulkAction();
      const initialChecked =
        intent === 'all' ? true :
        intent === 'unselect' ? false :
        this.isSelectedAll();

      const wrapped: AbstractMultiselectItem<T>[] =
        newPage.items.map(item => ({ item, isChecked: signal<boolean>(initialChecked) }));

      this.items = [...this.items, ...newPage.items];
      this.multiselectItems.update(curr => [...curr, ...wrapped]);
      this.page++;
    }

    this.loading = false;
  }

  // se cambi query/clear, puoi decidere se mantenere l’intenzione
  protected override resetPagination(): void {
    this.items = [];
    this.multiselectItems.set([]);
    this.page = 1;
    this.done = false;
    this.earlyDone = false;
    this.empty.set(true);

    // 👉 se vuoi che “seleziona tutti” sopravviva alle ricerche, commenta la riga sotto
    this.lastBulkAction.set('none');

    void this.loadMore();
  }
}
