import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

interface HistoryItem {
  id: string;
  type: 'notebook' | 'collection' | 'molecule'; // ecc
  title: string;
  updatedAt: string;
}

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <nav class="flex flex-col h-full bg-transparent z-50 select-none">
      <!-- Macro Area Menu -->
      <header class="flex justify-end items-center gap-4 pt-2 pr-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="fill-current w-6 h-auto text-light-on-surface-main dark:text-dark-on-surface-main">
        <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.--><path d="M418.4 157.9c35.3-8.3 61.6-40 61.6-77.9c0-44.2-35.8-80-80-80c-43.4 0-78.7 34.5-80 77.5L136.2 151.1C121.7 136.8 101.9 128 80 128c-44.2 0-80 35.8-80 80s35.8 80 80 80c12.2 0 23.8-2.7 34.1-7.6L259.7 407.8c-2.4 7.6-3.7 15.8-3.7 24.2c0 44.2 35.8 80 80 80s80-35.8 80-80c0-27.7-14-52.1-35.4-66.4l37.8-207.7zM156.3 232.2c2.2-6.9 3.5-14.2 3.7-21.7l183.8-73.5c3.6 3.5 7.4 6.7 11.6 9.5L317.6 354.1c-5.5 1.3-10.8 3.1-15.8 5.5L156.3 232.2z"/>
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="fill-current w-7 h-auto text-light-on-surface-main dark:text-dark-on-surface-main">
          <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM232 368l0-24 0-64-64 0-24 0 0-48 24 0 64 0 0-64 0-24 48 0 0 24 0 64 64 0 24 0 0 48-24 0-64 0 0 64 0 24-48 0z"/>
        </svg>
      </header>
      <div class="my-4">
        <button class="sidebar-link" routerLink="/collections">
          <span class="icon">📁</span> Collezioni
        </button>
        <button class="sidebar-link" routerLink="/notebooks">
          <span class="icon">📔</span> Notebook
        </button>
        <button class="sidebar-link" routerLink="/molecules">
          <span class="icon">🧬</span> Molecole
        </button>
        <!-- ...altre macro aree -->
      </div>
      <hr class="border-slate-300 dark:border-slate-600 my-2"/>

      <!-- Cronologia dinamica -->
      <div class="flex-1 overflow-y-auto">
        <h6 class="text-xs font-semibold opacity-60 mb-1 px-2">Cronologia</h6>
        @if (historyItems.length) {
          <ul>
            @for (item of historyItems; track item) {
              <li>
                <button
                  class="w-full text-left sidebar-history-link"
                  [routerLink]="['/', item.type, item.id]"
                  [attr.title]="item.title"
                >
                  <span class="icon mr-2">
                    <!-- Puoi variare l’icona in base a item.type -->
                    {{ getIcon(item.type) }}
                  </span>
                  <span class="truncate">{{ item.title }}</span>
                  <span class="ml-2 text-xs opacity-50">{{ item.updatedAt | date:'short' }}</span>
                </button>
              </li>
            }
          </ul>
          }
        @else {
          <p class="text-xs opacity-60 px-2 py-4">Nessuna attività recente.</p>
        }
      </div>
    </nav>
  `,
  styles: [`
    .sidebar-link {
      @apply flex items-center px-4 py-2 rounded-md transition hover:bg-slate-200/50 dark:hover:bg-slate-700/40 w-full mb-1 text-sm;
    }
    .sidebar-history-link {
      @apply flex items-center px-4 py-1 rounded-md hover:bg-slate-300/30 dark:hover:bg-slate-800/40 text-sm w-full;
    }
    .icon { width: 1.2em; display: inline-block; }
  `]
})
export class SidenavComponent implements OnInit {
  historyItems: HistoryItem[] = [];

  ngOnInit() {
    // **TODO: Qui chiami la tua API paginata**
    // Sostituisci questo mock con una fetch reale (servizio HTTP)
    setTimeout(() => {
      this.historyItems = [
        { id: 'abc', type: 'notebook', title: 'Notebook QSAR', updatedAt: new Date().toISOString() },
        { id: 'xyz', type: 'collection', title: 'Collezione Tossicità', updatedAt: new Date().toISOString() },
      ];
    }, 600);
  }

  getIcon(type: HistoryItem['type']): string {
    switch (type) {
      case 'notebook': return '📔';
      case 'collection': return '📁';
      case 'molecule': return '🧬';
      default: return '📄';
    }
  }
}
