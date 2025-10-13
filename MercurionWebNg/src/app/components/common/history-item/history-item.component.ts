import { Component, Input, signal } from '@angular/core';
import { HistoryDTO, HistoryItemEntity } from '../../../Models/history.models';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-history-item',
  imports: [RouterLink, DatePipe],
  template: `
    @if (_historyDTO()) {
      <a
        [routerLink]="pathToItem()"
        [queryParams]="queryParams()"
        class="grid grid-cols-[auto_1fr] gap-3 items-center py-2 px-3 rounded-xl transition
                   hover:bg-slate-50 dark:hover:bg-slate-800/70"
      >
        <!-- Icona -->
        <div
          class="flex size-9 shrink-0 items-center justify-center
                 rounded-xl border border-slate-400/70 dark:border-slate-700/60
                 bg-indigo-50 dark:bg-indigo-900/30
                 text-indigo-700 dark:text-indigo-300 text-sm font-semibold"
        >
          @switch (_historyDTO()!.itemEntity) {
            @case ('molecule_collections') {
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
                class="fill-current h-5 w-auto text-slate-900 dark:text-slate-200">
                <path d="M288 96L352 144L544 144L544 224L512 224L512 176L341.3 176L332.8 169.6L277.3 128L96 128L96 413.2L141.7 272L608 272L597.6 304L530.2 512L63.9 512L63.9 96L287.9 96zM320 480L507 480L564 304L165 304L108 480L320 480z"/>
              </svg>
            }
            @case ('molecule_collection_items') {
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
                class="fill-current h-5 w-auto text-slate-900 dark:text-slate-200">
                <path d="M239.6 502.1C188.8 519 157.3 512.2 142.9 497.7C128.5 483.2 121.6 451.7 138.5 401C143.9 384.8 151.4 367.7 161 350.1C177.8 373.9 197.7 397.5 220.4 420.2C243.1 442.9 266.7 462.8 290.5 479.6C272.9 489.2 255.8 496.8 239.6 502.1zM120.2 119.7C81 158.9 92.1 237.9 141.3 320C92.1 402.1 81 481.1 120.2 520.3C159.4 559.5 238.4 548.4 320.5 499.2C402.6 548.4 481.6 559.5 520.8 520.3C560 481.1 548.9 402.1 499.7 320C548.9 237.9 560 158.9 520.8 119.7C481.6 80.5 402.6 91.6 320.5 140.8C238.4 91.6 159.4 80.5 120.2 119.7zM243 397.5C217.7 372.2 196.4 345.9 179.2 320C196.4 294.1 217.8 267.7 243 242.5C268.2 217.3 294.6 195.9 320.5 178.7C346.4 195.9 372.8 217.3 398 242.5C423.2 267.7 444.6 294.1 461.8 320C444.6 345.9 423.2 372.3 398 397.5C372.8 422.7 346.4 444.1 320.5 461.3C294.6 444.1 268.2 422.7 243 397.5z"/>
              </svg>
            }
            @default {
              X
            }
          }
        </div>

        <!-- Testo (titolo + data) -->
        <div class="flex flex-col justify-center min-w-0">
          <p class="truncate text-sm font-medium text-slate-900 dark:text-slate-100 w-full block">
            {{ _historyDTO()?.itemName }}
          </p>
          <p class="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {{ _historyDTO()!.touchedAt | date: 'dd/MM/yyyy HH:mm:ss' }}
          </p>
        </div>

      </a>
    }
  `
})
export class HistoryItemComponent {
  _historyDTO = signal<HistoryDTO | undefined>(undefined)
  pathToItem = signal<string>('')
  queryParams = signal<Record<string, string>>({})

  @Input({ required: true })
  set historyDTO(historyDTO: HistoryDTO) {
    this._historyDTO.set(historyDTO)
    this.pathToItem.set(
      this.computePathToItem(historyDTO.itemEntity, historyDTO.itemId)
    )
    this.queryParams.set(JSON.parse(historyDTO.flagIds))
  }

  private computePathToItem(entity: HistoryItemEntity, id: string): string {
    switch (entity) {
      case 'molecule_collections':
        return `/molecules/collections/detail/${id}`
      case 'molecule_collection_items':
        return `/molecules/detail/${id}`
    }
  }
}
