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
    <nav class="flex flex-col h-full bg-transparent z-50 pt-4 select-none">
      <!-- Macro Area Menu -->
      <div class="mb-4">
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
