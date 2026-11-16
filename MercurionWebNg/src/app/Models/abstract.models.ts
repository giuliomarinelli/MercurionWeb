import { WritableSignal } from "@angular/core"

export interface AbstractMultiselectItem<T> {
  item: T
  isChecked: WritableSignal<boolean>
}
