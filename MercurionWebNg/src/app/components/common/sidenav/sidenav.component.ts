import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { UserContextService } from '../../../services/context/user-context.service';

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
      <header class="flex justify-end items-center gap-3 md:pt-4 mb-3 pr-[10px] sticky top-0">
        <button type="button" class="cursor-pointer hidden md:block">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current text-light-on-surface-main dark:text-slate-100 w-auto h-7 relative bottom-[2px]">
            <!--!Font Awesome Pro v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
            <path d="M320 112C434.9 112 528 205.1 528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320C112 205.1 205.1 112 320 112zM320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM280 400C266.7 400 256 410.7 256 424C256 437.3 266.7 448 280 448L360 448C373.3 448 384 437.3 384 424C384 410.7 373.3 400 360 400L352 400L352 312C352 298.7 341.3 288 328 288L280 288C266.7 288 256 298.7 256 312C256 325.3 266.7 336 280 336L304 336L304 400L280 400zM320 256C337.7 256 352 241.7 352 224C352 206.3 337.7 192 320 192C302.3 192 288 206.3 288 224C288 241.7 302.3 256 320 256z"/>
          </svg>
        </button>

      </header>

      @if (userContext.initials() !== '') {
        <!-- Macro Area Menu -->
        <h6 class="detail">Funzionalità</h6>
        <div class="mb-4">
          <a class="sidebar-link" routerLink="/collections">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="fill-current w-5 h-5">
              <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path class="text-neutral-700 dark:text-slate-200" d="M55.7 55.7C16.5 94.9 27.6 173.9 76.8 256C27.6 338.1 16.5 417.1 55.7 456.3s118.2 28.1 200.3-21.1c82.1 49.2 161.1 60.3 200.3 21.1s28.1-118.2-21.1-200.3c49.2-82.1 60.3-161.1 21.1-200.3S338.1 27.6 256 76.8C173.9 27.6 94.9 16.5 55.7 55.7zm45.3 45.3c1.3-1.3 16.8-12.4 64 3.3c10.4 3.5 21.4 8 32.8 13.6c-14.2 11.6-28.3 24.3-41.9 38s-26.4 27.7-38 41.9c-5.6-11.4-10.2-22.4-13.6-32.8c-15.7-47.2-4.6-62.7-3.3-64zm0 310.1c-1.3-1.3-12.4-16.8 3.3-64c3.5-10.4 8-21.4 13.6-32.9c11.6 14.2 24.3 28.3 38 41.9s27.7 26.4 41.9 38c-11.4 5.6-22.4 10.2-32.8 13.6c-47.2 15.7-62.7 4.6-64 3.3zM153.7 256c13.5-18.3 29.3-36.8 47.4-54.9s36.6-33.9 54.9-47.4c18.3 13.5 36.8 29.3 54.9 47.4s33.9 36.6 47.4 54.9c-13.5 18.3-29.3 36.8-47.4 54.9s-36.6 33.9-54.9 47.4c-18.3-13.5-36.8-29.3-54.9-47.4s-33.9-36.6-47.4-54.9zM314.2 117.9c11.4-5.6 22.4-10.2 32.9-13.6c47.2-15.7 62.7-4.6 64-3.3s12.4 16.8-3.3 64c-3.5 10.4-8 21.4-13.6 32.8c-11.6-14.2-24.3-28.3-38-41.9s-27.7-26.4-41.9-38zm0 276.2c14.2-11.6 28.3-24.3 41.9-38s26.4-27.7 38-41.9c5.6 11.4 10.2 22.4 13.6 32.9c15.7 47.2 4.6 62.7 3.3 64s-16.8 12.4-64-3.3c-10.4-3.5-21.4-8-32.9-13.6z"/>
              <path class="text-light-accent-secondary/50 dark:text-dark-accent-secondary" d="M256 296l-40-40 40-40 40 40-40 40z"/>
            </svg>
            <span class="sidebar-item-text">Collezioni molecolari</span>
          </a>
          <a class="sidebar-link" routerLink="/notebook">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="fill-current w-5 h-5">
              <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path class="text-light-accent-secondary/50 dark:text-dark-accent-secondary/50" d="M64 416c0-17.7 14.3-32 32-32l160 0 96 0 64 0 0 64-64 0-96 0L96 448c-17.7 0-32-14.3-32-32z"/>
              <path class="text-neutral-700 dark:text-slate-200" d="M0 96C0 43 43 0 96 0L384 0l32 0 32 0 0 384-32 0-64 0-96 0L96 384c-17.7 0-32 14.3-32 32s14.3 32 32 32l160 0 96 0 64 0 32 0 0 64-32 0-32 0L96 512c-53 0-96-43-96-96L0 96zm352 32l-224 0 0 32 224 0 0-32zM128 192l0 32 224 0 0-32-224 0z"/>
            </svg>
            <span class="sidebar-item-text">Quaderni di Laboratorio</span>
          </a>
          <a class="sidebar-link" routerLink="/molecules">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="fill-current w-5 h-5">
              <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path class="text-neutral-700 dark:text-slate-200"
                d="M288 0L160 0 128 0 96 0l0 64 32 0 0 150.9L4.7 415.2 0 422.9 0 432l0 48 0 32 32 0 384 0 32 0 0-32 0-48 0-9.1-4.7-7.7L320 214.9 320 64l32 0 0-64L320 0 288 0zM192 224l0-160 64 0 0 160 0 9.1 4.7 7.7L309.5 320l-171 0 48.8-79.2 4.7-7.7 0-9.1z"/>
            </svg>
            <span class="sidebar-item-text">Esperimenti</span>
          </a>
          <!-- ...altre macro aree -->
        </div>
        <hr class="border-slate-300 dark:border-slate-600 my-2"/>

        <!-- Cronologia dinamica -->
        <div class="flex-1 overflow-y-auto custom-scrollbar">
          <h6 class="detail ">Cronologia</h6>
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
      @apply flex items-center gap-3 px-[18px] py-2 rounded-md transition hover:bg-slate-200/50 dark:hover:bg-slate-700/40 w-full mb-1 text-sm;
    }
    .sidebar-item-text {
      @apply text-base font-medium;
    }
    .sidebar-history-link {
      @apply flex items-center px-4 py-1 rounded-md hover:bg-slate-300/30 dark:hover:bg-slate-800/40 text-sm w-full;
    }
    .icon {
      width: 1.2em; display: inline-block;
    }
    .detail {
      @apply text-sm font-semibold text-light-slate-detail dark:text-dark-slate-detail mt-1 md:mt-4 mb-2 px-2;
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
