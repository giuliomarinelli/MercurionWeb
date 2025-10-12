export interface HistoryDTO {
  id: string
  itemEntity: HistoryItemEntity
  touchedAt: number
  itemId: string
  itemName: string
  flagIds: string
}

export type HistoryItemEntity = 'molecule_collections' | 'molecule_collection_items'
