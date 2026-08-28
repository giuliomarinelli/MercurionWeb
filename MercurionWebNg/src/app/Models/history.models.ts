import { WritableSignal } from "@angular/core"

export interface HistoryDTO {
  id: string
  itemEntity: HistoryItemEntity
  touchedAt: number
  itemId: string
  itemName: string
  flagIds: string
}

export type TinyHistoryDTO = Pick<HistoryDTO,
  'id' | 'itemEntity' | 'itemId' | 'touchedAt'
>


export interface HistoryDTOExt extends HistoryDTO {
  selected: WritableSignal<boolean>
}

export type HistoryItemEntity = 'molecule_collections' | 'molecule_collection_items'
