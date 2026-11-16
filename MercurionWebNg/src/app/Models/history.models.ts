import { WritableSignal } from "@angular/core"
import type { HistoryDTO } from '@mercurion/rest-contracts'

export type {
  HistoryDTO,
  HistoryItemEntity,
  TinyHistoryDTO
} from '@mercurion/rest-contracts'


export interface HistoryDTOExt extends HistoryDTO {
  selected: WritableSignal<boolean>
}
