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
          <a class="sidebar-link" routerLink="/collections">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-6 h-6">
              <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path d="M154.1 486.4C162 494.3 185.5 503.3 234.5 487C247.7 482.6 261.7 476.6 276.1 469.1C257.2 454.7 238.4 438.3 220.3 420.2C202.2 402.1 185.8 383.3 171.4 364.4C163.9 378.8 157.9 392.8 153.5 406C137.2 455 146.2 478.5 154.1 486.4zM141.3 320C92.1 237.9 81 158.9 120.2 119.7C159.4 80.5 238.4 91.6 320.5 140.8C402.6 91.6 481.6 80.5 520.8 119.7C560 158.9 548.9 237.9 499.7 320C548.9 402.1 560 481.1 520.8 520.3C481.6 559.5 402.6 548.4 320.5 499.2C238.4 548.4 159.4 559.5 120.2 520.3C81 481.1 92.1 402.1 141.3 320zM171.5 275.6C185.9 256.7 202.3 237.9 220.4 219.8C238.5 201.7 257.3 185.3 276.2 170.9C261.8 163.4 247.8 157.4 234.6 153C185.6 136.7 162.1 145.7 154.2 153.6C146.3 161.5 137.3 185 153.6 234C158 247.2 164 261.2 171.5 275.6zM320.5 197.9C298.4 213.4 276 232 254.3 253.7C232.6 275.4 214 297.8 198.5 319.9C214 342 232.6 364.4 254.3 386.1C276 407.8 298.4 426.4 320.5 441.9C342.6 426.4 365 407.8 386.7 386.1C408.4 364.4 427 342 442.5 319.9C427 297.8 408.4 275.4 386.7 253.7C365 232 342.6 213.4 320.5 197.9zM469.5 275.6C477 261.2 483 247.2 487.4 234C503.7 185 494.7 161.5 486.8 153.6C478.9 145.7 455.4 136.7 406.4 153C393.2 157.4 379.2 163.4 364.8 170.9C383.7 185.3 402.5 201.7 420.6 219.8C438.7 237.9 455.1 256.7 469.5 275.6zM469.5 364.3C455.1 383.2 438.7 402 420.6 420.1C402.5 438.2 383.7 454.6 364.8 469C379.2 476.5 393.2 482.5 406.4 486.9C455.4 503.2 478.9 494.2 486.8 486.3C494.7 478.4 503.7 454.9 487.4 405.9C483 392.7 477 378.7 469.5 364.3zM320.5 359.9L280.5 319.9L320.5 279.9L360.5 319.9L320.5 359.9z"/>
            </svg>
            <span class="sidebar-item-text">Collezioni molecolari</span>
          </a>
          <a class="sidebar-link" routerLink="/notebook">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-6 h-6">
              <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path d="M184 64C135.4 64 96 103.4 96 152L96 496C96 540.2 131.8 576 176 576L520 576C533.3 576 544 565.3 544 552C544 538.7 533.3 528 520 528L512 528L512 451.9C531.3 439 544 417 544 392L544 136C544 96.2 511.8 64 472 64L184 64zM464 464L464 528L176 528C158.3 528 144 513.7 144 496C144 478.3 158.3 464 176 464L464 464zM176 416C164.6 416 153.8 418.4 144 422.7L144 152C144 129.9 161.9 112 184 112L472 112C485.3 112 496 122.7 496 136L496 392C496 405.3 485.3 416 472 416L176 416zM224 216C224 229.3 234.7 240 248 240L424 240C437.3 240 448 229.3 448 216C448 202.7 437.3 192 424 192L248 192C234.7 192 224 202.7 224 216zM248 288C234.7 288 224 298.7 224 312C224 325.3 234.7 336 248 336L424 336C437.3 336 448 325.3 448 312C448 298.7 437.3 288 424 288L248 288z"/>
            </svg>
            <span class="sidebar-item-text">Quaderni di Laboratorio</span>
          </a>
          <a class="sidebar-link" routerLink="/molecules">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-6 h-6">
              <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path d="M192 88C192 74.7 202.7 64 216 64L424 64C437.3 64 448 74.7 448 88C448 101.3 437.3 112 424 112L416 112L416 281.6L536.7 492.8C541.5 501.2 544 510.7 544 520.4C544 551.1 519.1 576 488.4 576L151.6 576C120.9 576 96 551.1 96 520.4C96 510.7 98.5 501.2 103.3 492.8L224 281.6L224 112L216 112C202.7 112 192 101.3 192 88zM272 112L272 288C272 292.2 270.9 296.3 268.8 299.9L229.9 368L410 368L371.1 299.9C369 296.3 367.9 292.2 367.9 288L367.9 112L271.9 112zM202.5 416L145 516.6C144.3 517.7 144 519 144 520.4C144 524.6 147.4 528 151.6 528L488.4 528C492.6 528 496 524.6 496 520.4C496 519.1 495.7 517.8 495 516.6L437.5 416L202.5 416z"/>
            </svg>
            <span class="sidebar-item-text">Esperimenti</span>
          </a>
          <!-- ...altre macro aree -->
          <hr class="border-slate-300 dark:border-slate-600 my-2"/>
        </div>
        <a class="sidebar-link" [routerLink]="'/molecules/editor'" [queryParams]="{ mode: 'create' }">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-6 h-6">
            <!--!Font Awesome Pro v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
            <path d="M122.9 379.1C112.2 389.8 104.4 403.2 100.3 417.8L64.9 545.6C62.6 553.9 64.9 562.9 71.1 569C77.3 575.1 86.2 577.5 94.5 575.2L222.3 539.7C236.9 535.6 250.2 527.9 261 517.1L555 223.1C568.4 209.6 576 191.2 576 172C576 152.8 568.4 134.4 554.8 120.9L519.1 85.2C505.6 71.6 487.2 64 468 64C448.8 64 430.4 71.6 416.9 85.2L122.9 379.2zM468 112C474.4 112 480.6 114.6 485.2 119.1L520.9 154.8C525.5 159.4 528 165.5 528 172C528 178.5 525.4 184.6 520.9 189.2L468 242.1L397.9 172L450.8 119.1C455.4 114.5 461.5 112 468 112zM173.9 396L364 205.9L434.1 276L244 466.1L173.9 396zM145.3 435.3L204.7 494.7L122.5 517.5L145.3 435.3z"/>
          </svg>
          <span class="sidebar-item-text">Crea una molecola</span>
        </a>
        <hr class="border-slate-300 dark:border-slate-600 mb-2"/>

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
      @apply flex items-center gap-[6px] px-[18px] py-2 rounded-md transition hover:bg-slate-200/50 dark:hover:bg-slate-700/40 w-full mb-1 text-sm;
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
