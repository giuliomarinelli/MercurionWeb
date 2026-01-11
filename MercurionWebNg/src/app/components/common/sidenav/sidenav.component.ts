import { NgClass } from '@angular/common';
import { Component, EventEmitter, inject, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { UserContextService } from '../../../services/context/user-context.service';
import { HistoryComponent } from '../history/history.component';
import { filter, Subscription } from 'rxjs';
import { HistoryService } from '../../../services/history.service';
import { ToastService } from '../../../services/toast.service';
import { ClassicSpinnerComponent } from "../classic-spinner/classic-spinner.component";
import { DesignService } from '../../../services/design.service';
import { SearchContextService } from '../../../services/context/search-context.service';
import { SelectionService } from '../../../services/selection.service';
import { AddMoleculesToCollectionContextService } from '../../../services/context/action-context/add-molecules-to-collection-context.service';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';

@Component({
  selector: 'm-sidenav',
  imports: [
    RouterLink,
    HistoryComponent,
    ClassicSpinnerComponent,
    NgClass
  ],
  template: `
    <nav class="flex flex-col h-full bg-transparent z-50 select-none pt-4 lg:pt-12" aria-label="Navigazione laterale">
      @if (designService.maxBk('sm')()) {
      @if (!isWelcomePath()) {
      <h6 class="detail">Strumenti</h6>
      <div [class.px-2]="userContext.isLoggedOut()">
          <button type="button" class="sidebar-link" (click)="searchOverlayContext.open()">
            <div
              class="flex size-9 shrink-0 items-center justify-center
                     rounded-xl border border-slate-400/70 dark:border-slate-500/60
                     bg-slate-200 dark:bg-slate-800
                     text-sm font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto text-slate-900 dark:text-slate-200">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M448.1 272C448.1 174.8 369.3 96 272.1 96C174.9 96 96.1 174.8 96.1 272C96.1 369.2 174.9 448 272.1 448C369.3 448 448.1 369.2 448.1 272zM407.5 430C371.1 461.2 323.8 480 272.2 480C157.3 480 64.2 386.9 64.2 272C64.2 157.1 157.3 64 272.2 64C387.1 64 480.2 157.1 480.2 272C480.2 323.7 461.4 371 430.2 407.3L571.6 548.7L582.9 560L560.3 582.6L549 571.3L407.6 429.9z"/>
              </svg>
            </div>
            <span class="sidebar-item-text">
              @if (userContext.isLoggedIn()) {
                <span>Cerca molecola</span>
              } @else {
                <span>Cerca molecola ChEMBL</span>
              }
            </span>
          </button>
        </div>
        <hr class="border-slate-300 dark:border-slate-600 my-2" />
        }
      }
      @if (userContext.isLoggedIn()) {
        <!-- Macro Area Menu -->
        <h6 class="detail">Funzionalità</h6>
        <div>
          <a class="sidebar-link" routerLink="molecules/all-my-molecules" (click)="handleMenuItemClick()"
              [class.bg-slate-300/65]="s.getActiveHeaderSelection('my-molecules')"
              [class.dark:bg-slate-700/80]="s.getActiveHeaderSelection('my-molecules')">
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
          <a class="sidebar-link"
              routerLink="molecules/collections"
              (click)="handleMenuItemClick()"
              [class.bg-slate-300/65]="s.getActiveHeaderSelection('my-collections')"
              [class.dark:bg-slate-700/80]="s.getActiveHeaderSelection('my-collections')">
            <div
              class="flex size-9 shrink-0 items-center justify-center
                     rounded-xl border border-slate-400/70 dark:border-slate-500/60
                     bg-teal-100 dark:bg-emerald-600/30
                     text-indigo-700 dark:text-indigo-300 text-sm font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto text-slate-900 dark:text-slate-200">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M336 64L400 128L608 128L608 448L128 448L128 64L336 64zM400 160L386.7 160L377.3 150.6L322.7 96L160 96L160 416L576 416L576 160L400 160zM64 176L64 512L512 512L512 544L32 544L32 160L64 160L64 176z"/>
              </svg>
            </div>
            <span class="sidebar-item-text">Le mie collezioni</span>
          </a>
          <hr class="border-slate-300 dark:border-slate-600 my-2" />
          <button class="sidebar-link" (click)="handleMenuItemClick(); importFromChembl()">
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
        <a class="sidebar-link"
           [routerLink]="'/molecules/editor'"
           [queryParams]="{ mode: 'create' }"
           (click)="handleMenuItemClick()"
           [class.bg-slate-300/65]="s.getActiveHeaderSelection('edit-molecule')"
           [class.dark:bg-slate-700/80]="s.getActiveHeaderSelection('edit-molecule')">
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
          <span class="sidebar-item-text">Disegna una molecola</span>
        </a>
        <div class="mb-1"></div>
        <hr class="border-slate-300 dark:border-slate-600 mb-2"/>

        <!-- Cronologia dinamica -->
        <div class="flex-1 overflow-y-auto custom-scrollbar">
          <div class="flex justify-between items-center">
            <h6 class="detail">Cronologia</h6>
            @if (triggerDelete()) {
              <div>
                <m-classic-spinner [size]="16" class="block mt-2 mr-5" />
              </div>
            } @else {
              <button
                type="button"
                class="relative p-1 rounded-md
                       transition-colors duration-150 mr-4 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed"
                [ngClass]="{
                  'hover:bg-slate-200': !isHistoryEmpty(),
                  'dark:hover:bg-slate-700': !isHistoryEmpty()
                }"
                title="Cancella la cronologia"
                [disabled]="isHistoryEmpty()"
                (click)="doDeleteHistory()"
                [attr.aria-disabled]="isHistoryEmpty()"
                aria-label="Cancella la cronologia"
              >
                <svg
                  [ngClass]="{
                    'size-4': true,
                    'text-light-error': !isHistoryEmpty(),
                    'dark:text-dark-error': !isHistoryEmpty(),
                    'pointer-events-none': isHistoryEmpty()
                  }"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M6 8a1 1 0 0 1 1 1v7h6V9a1 1 0 1 1 2 0v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1zM4 5a1 1 0 0 1 1-1h2V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v1H4V5z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            }
          </div>
          <m-history class="block"
            [triggerDelete]="triggerDelete()"
            [triggerEmptyCheck]="triggerEmptyCheck()"
            (emptyChange)="handleEmptyChange($event)"
            (itemClick)="handleMenuItemClick()" />
        </div>
      } @else {
        <!-- Menu per utente non loggato -->
        <h6 class="detail">Piacere di averti qui.</h6>
        <div [class.px-2]="userContext.isLoggedOut()">
          <a class="sidebar-link" (click)="handleMenuItemClick()" routerLink="/login">
            <div
              class="flex size-9 shrink-0 items-center justify-center
                     rounded-xl border border-slate-400/70 dark:border-slate-500/60
                     bg-blue-200 dark:bg-blue-700/60
                     text-indigo-700 dark:text-indigo-300 text-sm font-semibold"
              >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto text-slate-900 dark:text-slate-200">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M384 256L384 288L544 288L544 352L384 352L384 437.4L259.7 320L384 202.6L384 256zM576 256L416 256L416 128.3C381.9 160.5 357.3 183.7 236.3 298C235.4 298.9 227.6 306.2 213 320C222.9 329.3 256.6 361.2 375.5 473.4C377.2 475 390.7 487.8 416 511.6L416 383.9L576 383.9L576 255.9zM240 512L96 512L96 128L256 128L256 96L64 96L64 544L256 544L256 512L240 512z"/>
              </svg>
            </div>
            <span class="sidebar-item-text">Accedi</span>
          </a>
          <a class="sidebar-link" (click)="handleMenuItemClick()" routerLink="/register">
            <div
              class="flex size-9 shrink-0 items-center justify-center
                     rounded-xl border border-slate-400/70 dark:border-slate-500/60
                     bg-blue-200 dark:bg-blue-700/60
                     text-indigo-700 dark:text-indigo-300 text-sm font-semibold"
              >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto text-slate-900 dark:text-slate-200">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M288 96C395.3 96 485.1 171.5 506.9 272.3C518.4 272.9 529.6 274.6 540.4 277.2C520 156.2 414.8 64 288 64C146.6 64 32 178.6 32 320C32 461.4 146.6 576 288 576C304.7 576 321 574.4 336.8 571.4C330.5 562.1 325 552.1 320.4 541.7C309.8 543.2 299 544 288 544C243.9 544 202.7 531.2 168 509.2L199.1 416L310.1 416C313 404.9 316.8 394.2 321.5 384L176 384L141 489C93.8 448 64 387.5 64 320C64 196.3 164.3 96 288 96zM336 256C336 282.5 314.5 304 288 304C261.5 304 240 282.5 240 256C240 229.5 261.5 208 288 208C314.5 208 336 229.5 336 256zM288 176C243.8 176 208 211.8 208 256C208 300.2 243.8 336 288 336C332.2 336 368 300.2 368 256C368 211.8 332.2 176 288 176zM384 464C384 402.1 434.1 352 496 352C557.9 352 608 402.1 608 464C608 525.9 557.9 576 496 576C434.1 576 384 525.9 384 464zM640 464C640 384.5 575.5 320 496 320C416.5 320 352 384.5 352 464C352 543.5 416.5 608 496 608C575.5 608 640 543.5 640 464zM512 400L512 384L480 384L480 448L416 448L416 480L480 480L480 544L512 544L512 480L576 480L576 448L512 448L512 400z"/>
              </svg>
            </div>
            <span class="sidebar-item-text">Registrati</span>
          </a>
          <a class="sidebar-link" (click)="handleMenuItemClick()" routerLink="/contact-us">
            <div
              class="flex size-9 shrink-0 items-center justify-center
                     rounded-xl border border-slate-400/70 dark:border-slate-500/60
                     bg-blue-200 dark:bg-blue-700/60
                     text-indigo-700 dark:text-indigo-300 text-sm font-semibold"
              >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto text-slate-900 dark:text-slate-200">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M80 128L64 128L64 512L576 512L576 128L80 128zM544 184L544 199.9L320 364.2L96 199.9L96 160L544 160L544 184zM544 239.6L544 480L96 480L96 239.6L310.5 396.9L320 403.8L329.5 396.9L544 239.6z"/>
              </svg>
            </div>
            <span class="sidebar-item-text">Contattaci</span>
          </a>
        </div>
        <hr class="border-slate-300 dark:border-slate-600 my-2" />
        <div class="mb-4" [class.px-2]="userContext.isLoggedOut()">
          <h6 class="detail">Documenti</h6>
          <a class="sidebar-link" (click)="handleMenuItemClick()" routerLink="/terms-and-policies">
            <div
              class="flex size-9 shrink-0 items-center justify-center
                     rounded-xl border border-slate-400/70 dark:border-slate-500/60
                     bg-amber-100 dark:bg-amber-600/75
                     text-indigo-700 dark:text-indigo-300 text-sm font-semibold transition-colors duration-300"
              >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto text-slate-900 dark:text-slate-200">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M320 96L160 96L160 544L480 544L480 256L320 256L320 96zM466.7 224L352 109.3L352 224L466.7 224zM160 64L352 64L512 224L512 576L128 576L128 64L160 64zM264.3 368L299.9 368L303.3 379.4L323.9 448L448 448L448 480L300.1 480L296.7 468.6L277.1 403.3L220.5 474L210.5 486.5L185.5 466.5L195.5 454L259.5 374L264.3 368zM208 160L288 160L288 192L192 192L192 160L208 160zM208 224L288 224L288 256L192 256L192 224L208 224z"/>
              </svg>
            </div>
            <span class="sidebar-item-text">Termini e Policy</span>
          </a>
          <a class="sidebar-link" (click)="handleMenuItemClick()" routerLink="/privacy">
            <div
              class="flex size-9 shrink-0 items-center justify-center
                     rounded-xl border border-slate-400/70 dark:border-slate-500/60
                     bg-amber-100 dark:bg-amber-600/75
                     text-indigo-700 dark:text-indigo-300 text-sm font-semibold transition-colors duration-300"
              >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto text-slate-900 dark:text-slate-200">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M160 192C160 139 203 96 256 96C309 96 352 139 352 192C352 245 309 288 256 288C203 288 160 245 160 192zM65.5 576L119.7 400L272.1 400L272.1 368L96.1 368L32.1 576L65.6 576zM256 320C326.7 320 384 262.7 384 192C384 121.3 326.7 64 256 64C185.3 64 128 121.3 128 192C128 262.7 185.3 320 256 320zM352 391.2L448 359.2L448 566L447 565.6C389.2 539.9 352 482.6 352 419.4L352 391.2zM481 565.5L480 565.9L480 359.1L576 391.1L576 419.3C576 482.5 538.8 539.8 481 565.5zM464 320.1L320 368.1L320 419.3C320 495.2 364.7 563.9 434 594.8L464 608.1L494 594.8C563.3 564 608 495.2 608 419.3L608 368.1L464 320.1z"/>
              </svg>
            </div>
            <span class="sidebar-item-text">Informativa sulla Privacy</span>
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
export class SidenavComponent implements OnInit, OnDestroy {

  private readonly historyService = inject(HistoryService)
  protected readonly userContext = inject(UserContextService)
  private readonly toast = inject(ToastService)
  protected readonly designService = inject(DesignService)
  protected readonly searchOverlayContext = inject(SearchContextService)
  protected readonly s = inject(SelectionService)
  private readonly router = inject(Router)
  private readonly addContext = inject(AddMoleculesToCollectionContextService)
  private readonly actionContext = inject(ActionOverlayContextService)

  @Output()
  onOpenOffCanvas = new EventEmitter<void>()

  @Output()
  menuItemClick = new EventEmitter<void>()

  triggerDelete = signal<boolean>(false)
  isHistoryEmpty = signal<boolean>(false)
  triggerEmptyCheck = signal<boolean>(true)
  isWelcomePath = signal<boolean>(false)

  private delSub?: Subscription
  private routeSub?: Subscription

  private updateFromUrl(rawUrl: string): void {
    const currentPath = (rawUrl || '').split(/[?#]/)[0]
    const keys = ['my-molecules', 'my-collections', 'edit-molecule']

    let activeKey: string | null = null

    if (currentPath === '/molecules/all-my-molecules') {
      activeKey = 'my-molecules'
    }

    if (currentPath === '/molecules/collections') {
      activeKey = 'my-collections'
    }

    if (currentPath === '/molecules/editor') {
      activeKey = 'edit-molecule'
    }

    this.isWelcomePath.set(currentPath.startsWith('/welcome'))

    this.s.setHeaderSelections(keys.map((k) => this.s.generateHeaderSelection(k, k === activeKey)))
  }

  ngOnInit(): void {
    this.updateFromUrl(this.router.url)
    this.routeSub = this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd)
    ).subscribe((e) => {
      this.updateFromUrl(e.urlAfterRedirects)
    })
  }

  ngOnDestroy(): void {
    this.delSub?.unsubscribe()
    this.routeSub?.unsubscribe()
    this.s.clearHeaderSelections()
  }

  doDeleteHistory(): void {
    const onError = () => queueMicrotask(() => this.toast.trigger('Si è verificato un errore nella cancellazione della cronologia.'))
    this.delSub = this.historyService.deleteHistory().subscribe({
      next: (ok) => {
        if (!ok) {
          onError()
          return
        }
        queueMicrotask(() => this.triggerDelete.set(true))
      },
      error: () => onError()
    })
  }

  handleEmptyChange(e: boolean): void {
    this.isHistoryEmpty.set(e)
    this.triggerDelete.set(false)
    this.triggerEmptyCheck.set(false)
  }

  handleMenuItemClick(): void {
    this.menuItemClick.emit()
  }

  closeOffCanvasMenu(): void {
    this.menuItemClick.emit()
  }

  importFromChembl(): void {
    queueMicrotask(() => {
      this.addContext.setImportFromChembl(true)
      this.addContext.setRedirectToCollectionPath(true)
      this.actionContext.open('SelectCollectionThenRoute')
    })
  }

}
