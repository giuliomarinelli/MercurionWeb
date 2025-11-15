import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { UserContextService } from '../../../services/context/user-context.service';
import { HistoryComponent } from '../history/history.component';

interface HistoryItem {
  id: string;
  type: 'notebook' | 'collection' | 'molecule'; // ecc
  title: string;
  updatedAt: string;
}

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [RouterLink, HistoryComponent],
  template: `
    <nav class="flex flex-col h-full bg-transparent z-50 select-none pt-12">

      @if (userContext.initials() !== '') {
        <!-- Macro Area Menu -->
        <h6 class="detail">Funzionalità</h6>
        <div>
          <a class="sidebar-link" routerLink="molecules/all-my-molecules">
            <div
              class="flex size-9 shrink-0 items-center justify-center
                     rounded-xl border border-slate-400/70 dark:border-slate-500/60
                     bg-teal-100 dark:bg-emerald-600/30
                     text-indigo-700 dark:text-indigo-300 text-sm font-semibold"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
                class="fill-current h-5 w-auto text-slate-900 dark:text-slate-200">
                <path d="M239.6 502.1C188.8 519 157.3 512.2 142.9 497.7C128.5 483.2 121.6 451.7 138.5 401C143.9 384.8 151.4 367.7 161 350.1C177.8 373.9 197.7 397.5 220.4 420.2C243.1 442.9 266.7 462.8 290.5 479.6C272.9 489.2 255.8 496.8 239.6 502.1zM120.2 119.7C81 158.9 92.1 237.9 141.3 320C92.1 402.1 81 481.1 120.2 520.3C159.4 559.5 238.4 548.4 320.5 499.2C402.6 548.4 481.6 559.5 520.8 520.3C560 481.1 548.9 402.1 499.7 320C548.9 237.9 560 158.9 520.8 119.7C481.6 80.5 402.6 91.6 320.5 140.8C238.4 91.6 159.4 80.5 120.2 119.7zM243 397.5C217.7 372.2 196.4 345.9 179.2 320C196.4 294.1 217.8 267.7 243 242.5C268.2 217.3 294.6 195.9 320.5 178.7C346.4 195.9 372.8 217.3 398 242.5C423.2 267.7 444.6 294.1 461.8 320C444.6 345.9 423.2 372.3 398 397.5C372.8 422.7 346.4 444.1 320.5 461.3C294.6 444.1 268.2 422.7 243 397.5z"/>
              </svg>
            </div>
            <span class="sidebar-item-text">Le mie molecole</span>
          </a>
          <a class="sidebar-link" routerLink="molecules/collections">
            <div
              class="flex size-9 shrink-0 items-center justify-center
                     rounded-xl border border-slate-400/70 dark:border-slate-500/60
                     bg-teal-100 dark:bg-emerald-600/30
                     text-indigo-700 dark:text-indigo-300 text-sm font-semibold"
              >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto text-slate-900 dark:text-slate-200">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M336 64L400 128L608 128L608 448L128 448L128 64L336 64zM400 160L386.7 160L377.3 150.6L322.7 96L160 96L160 416L576 416L576 160L400 160zM64 176L64 512L512 512L512 544L32 544L32 160L64 160L64 176z"/>
              </svg>
            </div>
            <span class="sidebar-item-text">Le mie collezioni</span>
          </a>
          <hr class="border-slate-300 dark:border-slate-600 my-2"/>
          <button class="sidebar-link">
            <div
              class="flex size-9 shrink-0 items-center justify-center
                     rounded-xl border border-slate-400/70 dark:border-slate-500/60
                     bg-blue-200 dark:bg-blue-700/60
                     text-indigo-700 dark:text-indigo-300 text-sm font-semibold"
              >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto text-slate-900 dark:text-slate-200">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M552.1 320L590.7 320C578.7 308 548 277.3 498.7 228L579.4 147.3L590.7 136L579.4 124.7L515.4 60.7L504.1 49.4L492.8 60.7L412.1 141.4C362.7 92 332.1 61.4 320.1 49.4L320.1 320L49.5 320C61.5 332 92.2 362.7 141.5 412L60.8 492.7L49.5 504L60.8 515.3L124.8 579.3L136.1 590.6L147.4 579.3L228.1 498.6C277.5 548 308.1 578.6 320.1 590.6L320.1 320L552.1 320zM464.8 239.3L513.5 288L352.1 288L352.1 126.6C390.8 165.3 410.8 185.3 412.1 186.6L423.4 175.3L504.1 94.6L545.5 136L464.8 216.7L453.5 228L464.8 239.3zM175.4 400.7L126.7 352L288.1 352L288.1 513.4C249.4 474.7 229.4 454.7 228.1 453.4L216.8 464.7L136.1 545.4L94.7 504L175.4 423.3L186.7 412L175.4 400.7z"/>
              </svg>
            </div>
            <span class="sidebar-item-text">Importa da ChEMBL</span>
          </button>
          <!-- ...altre macro aree -->
        </div>
        <a class="sidebar-link" [routerLink]="'/molecules/editor'" [queryParams]="{ mode: 'create' }">
          <div
              class="flex size-9 shrink-0 items-center justify-center
                     rounded-xl border border-slate-400/70 dark:border-slate-500/60
                     bg-blue-200 dark:bg-blue-700/60
                     text-indigo-700 dark:text-indigo-300 text-sm font-semibold"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto text-slate-900 dark:text-slate-200">
              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path d="M58.1 555.9L48 592C50.7 591.2 117.4 572.6 248 536L569.4 214.6L592 192C589.6 189.6 549.1 149.1 470.6 70.6L448 48L425.4 70.6L104 392L58.1 555.9zM252.7 486L154 387.3L347.4 193.9L446.1 292.6L252.7 486zM229.4 508L94.2 545.8L132 410.6L229.4 508zM546.7 192L468.6 270.1L369.9 171.4L448 93.3L546.7 192z"/>
            </svg>
          </div>
          <span class="sidebar-item-text">Crea una molecola</span>
        </a>
        <div class="mb-1"></div>
        <hr class="border-slate-300 dark:border-slate-600 mb-2"/>

        <!-- Cronologia dinamica -->
        <div class="flex-1 overflow-y-auto custom-scrollbar">
          <h6 class="detail">Cronologia</h6>
            <app-history class="block" />
        </div>
      } @else {
        <!-- Menu per utente non loggato -->
        <h6 class="detail">Piacere di averti qui.</h6>
        <div class="mb-4">
          <a class="sidebar-link" routerLink="/login">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-5 h-5 text-light-on-surface-main dark:text-slate-200">
              <!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
              <path d="M409 337C418.4 327.6 418.4 312.4 409 303.1L265 159C258.1 152.1 247.8 150.1 238.8 153.8C229.8 157.5 224 166.3 224 176L224 256L112 256C85.5 256 64 277.5 64 304L64 336C64 362.5 85.5 384 112 384L224 384L224 464C224 473.7 229.8 482.5 238.8 486.2C247.8 489.9 258.1 487.9 265 481L409 337zM416 480C398.3 480 384 494.3 384 512C384 529.7 398.3 544 416 544L480 544C533 544 576 501 576 448L576 192C576 139 533 96 480 96L416 96C398.3 96 384 110.3 384 128C384 145.7 398.3 160 416 160L480 160C497.7 160 512 174.3 512 192L512 448C512 465.7 497.7 480 480 480L416 480z"/>
            </svg>
            <span class="sidebar-item-text">Accedi</span>
          </a>
          <a class="sidebar-link" routerLink="/register">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-5 h-5 text-light-on-surface-main dark:text-slate-200">
              <!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
              <path d="M256 312C322.3 312 376 258.3 376 192C376 125.7 322.3 72 256 72C189.7 72 136 125.7 136 192C136 258.3 189.7 312 256 312zM226.3 368C127.8 368 48 447.8 48 546.3C48 562.7 61.3 576 77.7 576L308 576C285.3 544.5 272 505.8 272 464C272 429.2 281.3 396.5 297.5 368.4C293.6 368.1 289.7 368 285.7 368L226.3 368zM464 608C543.5 608 608 543.5 608 464C608 384.5 543.5 320 464 320C384.5 320 320 384.5 320 464C320 543.5 384.5 608 464 608zM480 400L480 448L528 448C536.8 448 544 455.2 544 464C544 472.8 536.8 480 528 480L480 480L480 528C480 536.8 472.8 544 464 544C455.2 544 448 536.8 448 528L448 480L400 480C391.2 480 384 472.8 384 464C384 455.2 391.2 448 400 448L448 448L448 400C448 391.2 455.2 384 464 384C472.8 384 480 391.2 480 400z"/>
            </svg>
            <span class="sidebar-item-text">Registrati</span>
          </a>
          <a class="sidebar-link" routerLink="/collections">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-5 h-5 text-light-on-surface-main dark:text-slate-200">
              <!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
              <path d="M112 128C85.5 128 64 149.5 64 176C64 191.1 71.1 205.3 83.2 214.4L291.2 370.4C308.3 383.2 331.7 383.2 348.8 370.4L556.8 214.4C568.9 205.3 576 191.1 576 176C576 149.5 554.5 128 528 128L112 128zM64 260L64 448C64 483.3 92.7 512 128 512L512 512C547.3 512 576 483.3 576 448L576 260L377.6 408.8C343.5 434.4 296.5 434.4 262.4 408.8L64 260z"/>
            </svg>
            <span class="sidebar-item-text">Contattaci</span>
          </a>

        </div>
      }
    </nav>
  `,
  styles: [`
    .sidebar-link {
      @apply flex items-center -mx-px gap-3 px-3 py-2 rounded-md transition hover:bg-slate-50 dark:hover:bg-slate-800/70 w-full mb-1 text-sm;
    }
    .sidebar-item-text {
      @apply text-base;
    }
    .sidebar-history-link {
      @apply flex items-center px-4 py-1 rounded-md hover:bg-slate-300/30 dark:hover:bg-slate-800/40 text-sm w-full;
    }
    .icon {
      width: 1.2em; display: inline-block;
    }
    .detail {
      @apply text-sm font-semibold text-light-slate-detail dark:text-dark-slate-detail mt-1 lg:mt-2 mb-2 px-2 ml-2;
    }
  `]
})
export class SidenavComponent implements OnInit {

  historyItems: HistoryItem[] = [];

  constructor(protected readonly userContext: UserContextService) { }

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
