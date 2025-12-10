// ================== AbstractPaginatedMultiselectComponent ==================
import { ChangeDetectorRef, computed, inject, signal } from '@angular/core'
import { AbstractMultiselectItem } from '../Models/abstract.models'
import { AbstractPaginationComponent } from './abstract-pagination-component'
import { firstValueFrom } from 'rxjs'
import { PageModel } from '../Models/graphql/page.models'

export abstract class AbstractPaginatedMultiselectComponent<T> extends AbstractPaginationComponent<T> {

  protected readonly cdr = inject(ChangeDetectorRef)

  protected multiselectItems = signal<AbstractMultiselectItem<T>[]>([])

  // quando NON sei in bulkIntent 'all' => IDs selezionati globalmente
  protected selectedIdSet = signal<Set<string>>(new Set())

  // quando sei in bulkIntent 'all' => IDs esclusi globalmente
  protected excludedIdSet = signal<Set<string>>(new Set())

  // stato bulk globale, non derivato dai visibili
  protected bulkIntent = signal<'none' | 'all' | 'unselect'>('none')

  // true SOLO se l'utente ha esplicitamente attivato "seleziona tutti"
  protected isSelectedAll = computed(() => this.bulkIntent() === 'all')

  // selezione globale nulla (serve per disable bottone)
  protected isSelectedNothing = computed(() => {
    if (this.bulkIntent() === 'all') return false
    return this.selectedIdSet().size === 0
  })

  // per UI indeterminate sui visibili
  protected isPartiallySelected = computed(() => {
    const items = this.multiselectItems()
    if (items.length === 0) return false

    const allVisibleChecked = items.every(x => x.isChecked())
    const anyVisibleChecked = items.some(x => x.isChecked())

    if (this.bulkIntent() === 'all') {
      // globalmente tutti selezionati, ma tra i visibili c'è qualche esclusione
      return !allVisibleChecked
    }

    // bulkIntent none/unselect => parziale solo sui visibili
    return anyVisibleChecked && !allVisibleChecked
  })

  // ---------------------------
  // helpers per UI
  // ---------------------------

  protected toggleSelectAllVisible() {
    this.isSelectedAll() ? this.unselectAllVisible() : this.selectAllVisible()
  }

  protected onSelectAllChange(checked: boolean) {
    checked ? this.selectAllVisible() : this.unselectAllVisible()
  }

  protected clearSelections() {
    this.selectedIdSet.set(new Set())
    this.excludedIdSet.set(new Set())
    this.bulkIntent.set('none')

    queueMicrotask(() => {
      this.multiselectItems().forEach(x => x.isChecked.set(false))
      this.cdr.markForCheck()
    })
  }

  // chiamala dal componente quando cambia un singolo checkbox visibile
  protected toggleOne(visibleItem: AbstractMultiselectItem<T>) {
    const id = this.itemId(visibleItem.item)
    const checkedNow = visibleItem.isChecked()

    if (this.bulkIntent() === 'all') {
      // in modalità "tutti", il toggle gestisce esclusioni globali
      this.excludedIdSet.update(curr => {
        const next = new Set(curr)
        if (checkedNow) next.delete(id)
        else next.add(id)
        return next
      })
    } else {
      // in modalità normale, il toggle gestisce selezioni globali
      this.selectedIdSet.update(curr => {
        const next = new Set(curr)
        if (checkedNow) next.add(id)
        else next.delete(id)
        return next
      })

      // se stai selezionando a mano, il bulk non è attivo
      this.bulkIntent.set('none')
    }
  }

  // ---------------------------
  // bulk actions sui visibili
  // ---------------------------

  protected selectAllVisible() {
    this.bulkIntent.set('all')
    this.excludedIdSet.set(new Set())

    queueMicrotask(() => {
      this.multiselectItems().forEach(x => x.isChecked.set(true))
      this.cdr.markForCheck()
    })
  }

  protected unselectAllVisible() {
    this.bulkIntent.set('unselect')
    this.selectedIdSet.set(new Set())
    this.excludedIdSet.set(new Set())

    queueMicrotask(() => {
      this.multiselectItems().forEach(x => x.isChecked.set(false))
      this.cdr.markForCheck()
    })
  }

  // ---------------------------
  // pagination hook
  // ---------------------------

  protected override async loadMore() {
    if (this.loading || this.done) return
    this.loading = true

    const newPage: PageModel<T> = await firstValueFrom(this.fetch$())

    if (newPage.items.length === 0) {
      this.done = true
      this.earlyDone = true
      this.loading = false
      return
    }

    if (this.empty()) this.empty.set(false)

    this.items = [...this.items, ...newPage.items]
    this.page++

    const wrapped: AbstractMultiselectItem<T>[] = newPage.items.map(item => {
      const id = this.itemId(item)

      const checked =
        this.bulkIntent() === 'all'
          ? !this.excludedIdSet().has(id)
          : this.selectedIdSet().has(id)

      return {
        item,
        isChecked: signal<boolean>(checked)
      }
    })

    this.multiselectItems.update(curr => [...curr, ...wrapped])

    this.loading = false
  }

  protected override resetPagination() {
    // reset solo vista/paginazione
    this.items = []
    this.multiselectItems.set([])
    this.page = 1
    this.done = false
    this.earlyDone = false
    this.empty.set(true)
    this.loading = false

    // il filtro cambia => il bulk sui visibili perde senso
    // ma le selezioni globali restano
    if (this.bulkIntent() !== 'all') {
      this.bulkIntent.set('none')
    }

    void this.loadMore()
  }

  // ---------------------------
  // id strategy
  // ---------------------------

  protected itemId(item: T): string {
    return (item as any).id
  }
}
