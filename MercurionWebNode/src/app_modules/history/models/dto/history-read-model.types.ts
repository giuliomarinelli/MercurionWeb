import { HistoryItemEntity } from '../enums/history-item-entity.enum'

export interface HistoryQueryProjection {
    id: string
    itemEntity: HistoryItemEntity
    touchedAt: string | number
    itemId: string
    flagIds: string
}

export interface HistoryCollectionNameProjection {
    id: string
    name: string | null
}

export interface HistoryItemNameProjection {
    id: string
    type: string
    name: string | null
    chemblMolregno: string | number | null
}
