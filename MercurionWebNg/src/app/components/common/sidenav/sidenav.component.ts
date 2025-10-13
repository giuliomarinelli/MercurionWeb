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
    <nav class="flex flex-col h-full bg-transparent z-50 select-none">
      <header class="flex justify-end items-center gap-3 lg:pt-4 mb-3 pr-[10px] sticky top-0">
        <button type="button" class="cursor-pointer hidden lg:block">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current text-light-on-surface-main dark:text-slate-100 w-auto h-7 relative bottom-[2px]">
            <!--!Font Awesome Pro v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
            <path d="M320 112C434.9 112 528 205.1 528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320C112 205.1 205.1 112 320 112zM320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM280 400C266.7 400 256 410.7 256 424C256 437.3 266.7 448 280 448L360 448C373.3 448 384 437.3 384 424C384 410.7 373.3 400 360 400L352 400L352 312C352 298.7 341.3 288 328 288L280 288C266.7 288 256 298.7 256 312C256 325.3 266.7 336 280 336L304 336L304 400L280 400zM320 256C337.7 256 352 241.7 352 224C352 206.3 337.7 192 320 192C302.3 192 288 206.3 288 224C288 241.7 302.3 256 320 256z"/>
          </svg>
        </button>

      </header>


      @if (userContext.initials() !== '') {
        <!-- Macro Area Menu -->
        <h6 class="detail">Funzionalità</h6>
        <div>
          <a class="sidebar-link" routerLink="molecules/collections">
            <div
              class="flex size-9 shrink-0 items-center justify-center
                     rounded-xl border border-slate-400/70 dark:border-slate-700/60
                     bg-emerald-50 dark:bg-emerald-900/30
                     text-indigo-700 dark:text-indigo-300 text-sm font-semibold"
              >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
                class="fill-current h-5 w-auto text-slate-900 dark:text-slate-200">
                <path d="M239.6 502.1C188.8 519 157.3 512.2 142.9 497.7C128.5 483.2 121.6 451.7 138.5 401C143.9 384.8 151.4 367.7 161 350.1C177.8 373.9 197.7 397.5 220.4 420.2C243.1 442.9 266.7 462.8 290.5 479.6C272.9 489.2 255.8 496.8 239.6 502.1zM120.2 119.7C81 158.9 92.1 237.9 141.3 320C92.1 402.1 81 481.1 120.2 520.3C159.4 559.5 238.4 548.4 320.5 499.2C402.6 548.4 481.6 559.5 520.8 520.3C560 481.1 548.9 402.1 499.7 320C548.9 237.9 560 158.9 520.8 119.7C481.6 80.5 402.6 91.6 320.5 140.8C238.4 91.6 159.4 80.5 120.2 119.7zM243 397.5C217.7 372.2 196.4 345.9 179.2 320C196.4 294.1 217.8 267.7 243 242.5C268.2 217.3 294.6 195.9 320.5 178.7C346.4 195.9 372.8 217.3 398 242.5C423.2 267.7 444.6 294.1 461.8 320C444.6 345.9 423.2 372.3 398 397.5C372.8 422.7 346.4 444.1 320.5 461.3C294.6 444.1 268.2 422.7 243 397.5z"/>
              </svg>
            </div>
            <span class="sidebar-item-text">Le mie molecole</span>
          </a>
          <a class="sidebar-link" routerLink="/notebook">
            <div
              class="flex size-9 shrink-0 items-center justify-center
                     rounded-xl border border-slate-400/70 dark:border-slate-700/60
                     bg-emerald-50 dark:bg-emerald-900/30
                     text-indigo-700 dark:text-indigo-300 text-sm font-semibold"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto text-slate-900 dark:text-slate-200">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M96 64L544 64L544 480L512 480L512 544L544 544L544 576L96 576L96 512L96 512L96 80L96 64zM160 480C142.3 480 128 494.3 128 512L128 544L480 544L480 480L160 480zM128 456.6C137.4 451.2 148.3 448 160 448L512 448L512 96L128 96L128 456.6zM240 192L448 192L448 224L224 224L224 192L240 192zM240 288L448 288L448 320L224 320L224 288L240 288z"/>
              </svg>
            </div>
            <span class="sidebar-item-text">Quaderni di Laboratorio</span>
          </a>
          <a class="sidebar-link" routerLink="/molecules">
            <div
              class="flex size-9 shrink-0 items-center justify-center
                     rounded-xl border border-slate-400/70 dark:border-slate-700/60
                     bg-emerald-50 dark:bg-emerald-900/30
                     text-indigo-700 dark:text-indigo-300 text-sm font-semibold"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto text-slate-900 dark:text-slate-200">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M224 288L96 512L96 576L544 576L544 512L416 288L416 96L448 96L448 64L192 64L192 96L224 96L224 288zM256 96L384 96L384 296.5L388.2 303.9L434 384L206 384L251.8 303.9L256 296.5L256 96zM187.7 416L452.3 416L512 520.5L512 544L128 544L128 520.5L187.7 416z"/>
              </svg>
            </div>
            <span class="sidebar-item-text">Esperimenti</span>
          </a>
          <!-- ...altre macro aree -->
          <hr class="border-slate-300 dark:border-slate-600 my-2"/>
        </div>
        <a class="sidebar-link" [routerLink]="'/molecules/editor'" [queryParams]="{ mode: 'create' }">
          <div
              class="flex size-9 shrink-0 items-center justify-center
                     rounded-xl border border-slate-400/70 dark:border-slate-500/60
                     bg-sky-100 dark:bg-sky-700/60
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
      @apply flex items-center -mx-px gap-3 px-3 py-2 rounded-md transition hover:bg-slate-50/70 dark:hover:bg-slate-700/40 w-full mb-1 text-sm;
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
