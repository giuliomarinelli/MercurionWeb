import { History } from "../entities/history.entity"

export type HistoryDTO = Omit<History, 'userId'> & {
    itemName: string
}

export type TinyHistoryDTO = Pick<HistoryDTO,
  'id' | 'itemEntity' | 'itemId' | 'touchedAt'
>
