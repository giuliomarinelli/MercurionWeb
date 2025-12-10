// ================== AbstractPaginatedMultiselectComponent ==================
import { ChangeDetectorRef, computed, effect, inject, signal } from "@angular/core"
import { AbstractMultiselectItem } from "../Models/abstract.models"
import { AbstractPaginationComponent } from "./abstract-pagination-component"
import { firstValueFrom } from "rxjs"
import { PageModel } from "../Models/graphql/page.models"

export abstract class AbstractPaginatedMultiselectComponent<T> extends AbstractPaginationComponent<T> {

  protected readonly cdr = inject(ChangeDetectorRef)

  protected multiselectItems = signal<AbstractMultiselectItem<T>[]>([])
  protected selectedIdSet = signal<Set<string>>(new Set())

  protected lastBulkAction = signal<"none" | "all" | "unselect">("none")

  protected isSelectedAll = computed(() =>
    this.lastBulkAction() === "all"
  )

  protected isSelectedNothing = computed(() => {
    const items = this.multiselectItems()
    if (items.length === 0) return true
    return items.every(i => !i.isChecked())
  })

  protected isPartiallySelected = computed(() =>
    !this.isSelectedNothing() && !this.isSelectedAll()
  )

  constructor() {
    super()

    effect(() => {
      if (this.isPartiallySelected() && this.lastBulkAction() !== "none") {
        this.lastBulkAction.set("none")
      }
    })

    effect(() => {
      const items = this.multiselectItems()
      const next = new Set<string>()

      for (const i of items) {
        if (i.isChecked()) next.add(this.itemId(i.item))
      }

      this.selectedIdSet.set(next)
    })
  }

  protected selectAll(): void {
    this.lastBulkAction.set("all")
    queueMicrotask(() => {
      this.multiselectItems().forEach(i => i.isChecked.set(true))
    })
  }

  protected unselectAll(): void {
    this.lastBulkAction.set("unselect")
    queueMicrotask(() => {
      this.multiselectItems().forEach(i => i.isChecked.set(false))
    })
  }

  protected toggleSelectAll(): void {
    this.isSelectedAll() ? this.unselectAll() : this.selectAll()
  }

  protected onSelectAllChange(checked: boolean): void {
    checked ? this.selectAll() : this.unselectAll()
  }

  protected override async loadMore(): Promise<void> {
    if (this.loading || this.done) return
    this.loading = true

    const newPage: PageModel<T> = await firstValueFrom(this.fetch$())

    if (newPage.items.length === 0) {
      this.done = true
      this.earlyDone = true
      this.loading = false
      this.cdr.markForCheck()
      return
    }

    if (this.empty()) this.empty.set(false)

    const intent = this.lastBulkAction()
    const alreadySelected = this.selectedIdSet()

    const wrapped: AbstractMultiselectItem<T>[] =
      newPage.items.map(item => {
        const initialChecked =
          intent === "all" ? true :
          intent === "unselect" ? false :
          alreadySelected.has(this.itemId(item))

        return {
          item,
          isChecked: signal<boolean>(initialChecked)
        }
      })

    this.items = [...this.items, ...newPage.items]
    this.multiselectItems.update(curr => [...curr, ...wrapped])
    this.page++

    this.loading = false
  }

  protected override resetPagination(): void {
    this.items = []
    this.multiselectItems.set([])
    this.page = 1
    this.done = false
    this.earlyDone = false
    this.empty.set(true)
    this.loading = false

    this.lastBulkAction.set("none")

    void this.loadMore()
  }

  protected clearSelections(): void {
    this.lastBulkAction.set("none")
    queueMicrotask(() => {
      this.multiselectItems().forEach(i => i.isChecked.set(false))
    })
  }

  protected itemId(item: T): string {
    return (item as any).id
  }
}
