import { NgClass, NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, EventEmitter, inject, Input, OnDestroy, OnInit, Output, Signal, signal } from '@angular/core';
import { ThemeManagerService } from '../../../services/context/theme-manager.service';
import { ThemeChoice } from '../../../Models/theme.models';
import { DesignService } from '../../../services/design.service';
import { NavComponent } from '../nav/nav.component';
import { SearchContextService } from '../../../services/context/search-context.service';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { PublicPipe } from '../../../pipes/public.pipe';
import { UserContextService } from '../../../services/context/user-context.service';
import { filter, Subscription } from 'rxjs';
import { SidenavComponent } from '../sidenav/sidenav.component';
import { AccountService } from '../../../services/account.service';
import { AuthService } from '../../../services/auth.service';
import { SessionSyncService } from '../../../services/session-sync.service';
import { PathService } from '../../../services/path.service';
import { ToastService } from '../../../services/toast.service';
import { ProvidedEmailDTO } from '../../../Models/account/account.models';
import { environment } from '../../../../environments/environment.development';
import { AppContextService } from '../../../services/context/app-context.service';

@Component({
  selector: 'm-header',
  imports: [
    NgOptimizedImage,
    NgClass,
    NavComponent,
    RouterLink,
    PublicPipe,
    SidenavComponent,
    NgTemplateOutlet
  ],
  template: `

 <header class="px-6 py-4 bg-light-surface-secondary dark:bg-neutral-950 border-b-[0.5px] border-slate-300/65 dark:border-slate-300/40 header-shadow" role="banner">
  <div class="w-full flex justify-between items-center transition-colors duration-300 ease-out">
    <div class="flex items-center gap-4">
      @if (designService.maxBk("lg")()) {
      <button
        class="inline-flex items-center justify-center size-10 rounded-full hover:bg-slate-200/80 dark:hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-accent-primary-hq transition-colors"
        (click)="noToast(); toggleOffCanvasMenu()"
        aria-label="Apri o chiudi menu laterale">
        <svg xmlns="http://www.w3.org/2000/svg"
          class="h-[22px] w-[22px] min-[350px]:h-6 min-[350px]:w-6 fill-current text-slate-700 dark:text-slate-100 off-canvas-menu-button"
          viewBox="0 0 448 512">
          <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path
            d="M0 88C0 74.7 10.7 64 24 64l400 0c13.3 0 24 10.7 24 24s-10.7 24-24 24L24 112C10.7 112 0 101.3 0 88zM0 248c0-13.3 10.7-24 24-24l272 0c13.3 0 24 10.7 24 24s-10.7 24-24 24L24 272c-13.3 0-24-10.7-24-24zM192 408c0 13.3-10.7 24-24 24L24 432c-13.3 0-24-10.7-24-24s10.7-24 24-24l144 0c13.3 0 24 10.7 24 24z" />
        </svg>
      </button>
      }
      @if (designService.minBk("md")()) {
      <div class="flex gap-7 items-center">
        <a routerLink="/" aria-label="Vai alla home">
          <img [ngSrc]="logoSrc() | public" alt="Mercurion" width="927" height="234" title="Mercurion" priority="true"
            class="w-[145px] h-auto contrast-115" />
        </a>
        @if (designService.minBk("lg")()) {
        <h3
          class="font-semibold font-spacegrotesk tracking-widest text-sm relative top-[3.5px] text-slate-700 dark:text-slate-300 cursor-default">
          Next Gen Chemistry.
        </h3>
        }
      </div>
      }
      @if (designService.minBk("lg")() && userContext.isLoggedIn()) {
      <m-nav [header]="true"></m-nav>
      }
    </div>
    @if (designService.maxBk("sm")()) {
    <a routerLink="/" aria-label="Vai alla home">
      <img [ngSrc]="logoSrc() | public" alt="Mercurion" width="927" height="234" priority="true"
        class="w-[128px] min-[350px]:w-[145px] h-auto contrast-115" />
    </a>
    }
    <div class="theme-menu-container flex gap-2 pr-2">
      @if (!userContext.isLoggedIn() && !isLoginPath()) {
      <div
        class="hidden lg:flex items-center gap-3 text-sm xl:text-[0.925rem] font-medium text-light-on-surface-main dark:text-slate-100 tracking-wider mr-3 relative top-[1px]">
        <a routerLink="/login"
          class="hover:text-light-accent-primary hover:dark:text-dark-accent-primary transition-colors duration-300">Accedi</a>
        @if (!isRegisterPath()) {
        <span class="cursor-default text-slate-700 dark:text-slate-300">●</span>
        <a routerLink="/register"
          class="hover:text-light-accent-primary hover:dark:text-dark-accent-primary transition-colors duration-300">Registrati</a>
        }
      </div>
      }
      <!-- Ricerca fittizia o icona -->
      @if (
      userContext.isLoggedIn() ||
      (!userContext.isLoggedIn() && isLoginPath())
      ) {
      <div class="hidden lg:block">
        <div (click)="openSearchOverlay()"
          class="flex items-center px-4 py-2.5 bg-slate-100 border border-slate-500/40 dark:border-none hover:bg-slate-200/30 dark:hover:bg-neutral-700 dark:bg-neutral-800 rounded-full cursor-pointer transition w-[240px] mr-2">
          <svg class="w-4 h-4 mr-2 fill-current text-slate-700 dark:text-slate-200" xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512">
            <path
              d="M505 442.7L405.3 343c28.4-34.9 45.5-79 45.5-127.3C450.8 103.5 347.3 0 225.4 0S0 103.5 0 215.6s103.5 215.6 225.4 215.6c48.3 0 92.4-17.1 127.3-45.5l99.7 99.7c4.6 4.6 10.6 7 16.7 7s12.1-2.3 16.7-7c9.3-9.2 9.3-24.4 0-33.7zM225.4 367c-83.5 0-151.4-67.9-151.4-151.4s67.9-151.4 151.4-151.4 151.4 67.9 151.4 151.4-67.9 151.4-151.4 151.4z" />
          </svg>
          @if (userContext.isLoggedIn()) {
          <span class="text-sm text-slate-700 dark:text-slate-200">Cerca molecola...</span>
          } @else {
          <span class="text-xs py-[3px] text-slate-700 dark:text-slate-200">Cerca molecola ChEMBL...</span>
          }
        </div>
      </div>
      }
      <div class="hidden sm:block" [ngClass]="{
          'lg:hidden': userContext.isLoggedIn() || isLoginPath(),
        }">
        <button
          (click)="openSearchOverlay()"
          class="inline-flex items-center justify-center size-10 rounded-full relative left-0.5 text-slate-700 dark:text-gray-200 hover:bg-slate-200/80 dark:hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-accent-primary-hq transition-colors">
          <svg class="w-5 h-5 fill-current text-slate-700 dark:text-gray-200" xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512">
            <path
              d="M505 442.7L405.3 343c28.4-34.9 45.5-79 45.5-127.3C450.8 103.5 347.3 0 225.4 0S0 103.5 0 215.6s103.5 215.6 225.4 215.6c48.3 0 92.4-17.1 127.3-45.5l99.7 99.7c4.6 4.6 10.6 7 16.7 7s12.1-2.3 16.7-7c9.3-9.2 9.3-24.4 0-33.7zM225.4 367c-83.5 0-151.4-67.9-151.4-151.4s67.9-151.4 151.4-151.4 151.4 67.9 151.4 151.4-67.9 151.4-151.4 151.4z" />
          </svg>
        </button>
      </div>

      <button class="flex items-center justify-center size-10 rounded-full theme-toggle-button mr-0 xs:mr-1 lg:mr-2 transition-all duration-500 hover:bg-slate-200/80 dark:hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-accent-primary-hq" [ngClass]="{
          'xl:ml-1': userContext.isLoggedIn() || isLoginPath(),
        }"
        (click)="toggleThemeMenu()"
        [attr.title]="themeMenuOpen() ? 'Chiudi il menù di selezione del tema' : 'Apri il menu di selezione del tema'"
        aria-label="Seleziona tema">
        @if (themeManager.theme() === "dark") {
        <svg xmlns="http://www.w3.org/2000/svg"
          class="h-[22px] w-[22px] min-[350px]:h-7 min-[350px]:w-7 fill-current text-slate-100 hover:text-slate-300 transition-colors duration-300"
          viewBox="0 0 384 512">
          <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
          <path
            d="M223.5 32C100 32 0 132.3 0 256S100 480 223.5 480c60.6 0 115.5-24.2 155.8-63.4c5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6c-96.9 0-175.5-78.8-175.5-176c0-65.8 36-123.1 89.3-153.3c6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z" />
        </svg>
        } @else {
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 512 512">
          <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path class="fill-current text-emerald-500" d="M208 256a48 48 0 1 0 96 0 48 48 0 1 0 -96 0z" />
          <path class="fill-current text-light-on-surface-secondary"
            d="M232 88l0 24 48 0 0-24 0-64 0-24L232 0l0 24 0 64zm24 120a48 48 0 1 1 0 96 48 48 0 1 1 0-96zm0 144a96 96 0 1 0 0-192 96 96 0 1 0 0 192zM0 232l0 48 24 0 64 0 24 0 0-48-24 0-64 0L0 232zm424 0l-24 0 0 48 24 0 64 0 24 0 0-48-24 0-64 0zM232 512l48 0 0-24 0-64 0-24-48 0 0 24 0 64 0 24zM92 58L58 92l17 17 45.3 45.3 17 17 33.9-33.9-17-17L108.9 75 92 58zM391.8 357.8l-17-17-33.9 33.9 17 17L403.1 437l17 17L454 420l-17-17-45.3-45.3zM58 420L92 454l17-17 45.3-45.3 17-17-33.9-33.9-17 17L75 403.1 58 420zM357.8 120.2l-17 17 33.9 33.9 17-17L437 108.9l17-17L420 58l-17 17-45.3 45.3z" />
        </svg>
        }
      </button>
      @if (
      designService.minBk("md")() &&
      userContext.isLoggedIn() &&
      isAllowedPath()
      ) {
      <button (click)="toggleAvatarMenu()" [innerHTML]="userContext.initials()"
        [attr.title]="avatarMenuOpen() ? 'Chiudi il menù utente' : 'Apri il menu utente'"
        class="avatar-toggle-button inline-flex items-center justify-center size-10 rounded-full cursor-pointer bg-light-accent-secondary-500/80 text-slate-100 dark:bg-dark-accent-primary-btn bg-light-accent-secondary/85 hover:bg-emerald-900/60 hover:text-slate-100 dark:hover:bg-blue-400/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-accent-primary-hq text-sm font-semibold transition-colors duration-300">
      </button>
      }

    </div>
  </div>
</header>
<!-- Menu cambio tema -->
@if (themeMenuMounted()) {
<div
  class="theme-menu-container absolute -right-2 min-[350px]:right-8 sm:right-20 md:right-28 mt-2 z-50 w-64 text-md rounded-md shadow-lg bg-white text-light-on-surface-main dark:text-slate-100 dark:bg-neutral-800 transform transition-all duration-300 ease-out"
  [ngClass]="{
      'opacity-100 translate-x-0 translate-y-0': themeMenuVisible(),
      'opacity-0 pointer-events-none translate-x-2 -translate-y-2':
        !themeMenuVisible(),
    }">
  <div class="py-2 z-[999]">
    <button (click)="onThemeChange('light'); closeThemeMenu()"
      class="group flex items-center w-full px-4 py-4 gap-4 dark:hover:bg-slate-300/30 hover:bg-slate-200/40 transition-colors duration-300"
      [ngClass]="{
          'bg-slate-200 dark:bg-slate-500': themeManager.chosenTheme() === 'light',
        }">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 512 512">
        <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
        <path class="fill-current text-light-accent-secondary dark:text-dark-accent-secondary"
          d="M208 256a48 48 0 1 0 96 0 48 48 0 1 0 -96 0z" />
        <path class="fill-current text-light-on-surface-secondary dark:text-slate-300"
          d="M232 88l0 24 48 0 0-24 0-64 0-24L232 0l0 24 0 64zm24 120a48 48 0 1 1 0 96 48 48 0 1 1 0-96zm0 144a96 96 0 1 0 0-192 96 96 0 1 0 0 192zM0 232l0 48 24 0 64 0 24 0 0-48-24 0-64 0L0 232zm424 0l-24 0 0 48 24 0 64 0 24 0 0-48-24 0-64 0zM232 512l48 0 0-24 0-64 0-24-48 0 0 24 0 64 0 24zM92 58L58 92l17 17 45.3 45.3 17 17 33.9-33.9-17-17L108.9 75 92 58zM391.8 357.8l-17-17-33.9 33.9 17 17L403.1 437l17 17L454 420l-17-17-45.3-45.3zM58 420L92 454l17-17 45.3-45.3 17-17-33.9-33.9-17 17L75 403.1 58 420zM357.8 120.2l-17 17 33.9 33.9 17-17L437 108.9l17-17L420 58l-17 17-45.3 45.3z" />
      </svg>
      <span>Tema chiaro</span>
      @if (themeManager.chosenTheme() === "light") {
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 relative left-2" viewBox="0 0 512 512">
        <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
        <path class="fill-current text-light-accent-secondary dark:text-dark-accent-secondary"
          d="M0 256a256 256 0 1 0 512 0A256 256 0 1 0 0 256zm126.1 0L160 222.1c.3 .3 .6 .6 1 1c5.3 5.3 10.7 10.7 16 16c15.7 15.7 31.4 31.4 47 47c37-37 74-74 111-111c5.3-5.3 10.7-10.7 16-16c.3-.3 .6-.6 1-1L385.9 192c-.3 .3-.6 .6-1 1l-16 16L241 337l-17 17-17-17-64-64c-5.3-5.3-10.7-10.7-16-16l-1-1z" />
        <path class="fill-current text-slate-50"
          d="M385 193L241 337l-17 17-17-17-80-80L161 223l63 63L351 159 385 193z" />
      </svg>
      }
    </button>
    <button (click)="onThemeChange('dark'); closeThemeMenu()"
      class="group flex items-center w-full px-4 py-4 gap-4 dark:hover:bg-slate-300/30 hover:bg-slate-200/40 transition-colors duration-300"
      [ngClass]="{
          'bg-slate-200 dark:bg-slate-500': themeManager.chosenTheme() === 'dark',
        }">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 fill-current text-slate-400 dark:text-slate-100"
        viewBox="0 0 384 512">
        <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
        <path
          d="M223.5 32C100 32 0 132.3 0 256S100 480 223.5 480c60.6 0 115.5-24.2 155.8-63.4c5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6c-96.9 0-175.5-78.8-175.5-176c0-65.8 36-123.1 89.3-153.3c6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z" />
      </svg>
      <span>Tema scuro</span>
      @if (themeManager.chosenTheme() === "dark") {
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 relative left-2" viewBox="0 0 512 512">
        <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
        <path class="fill-current text-light-accent-secondary dark:text-dark-accent-secondary"
          d="M0 256a256 256 0 1 0 512 0A256 256 0 1 0 0 256zm126.1 0L160 222.1c.3 .3 .6 .6 1 1c5.3 5.3 10.7 10.7 16 16c15.7 15.7 31.4 31.4 47 47c37-37 74-74 111-111c5.3-5.3 10.7-10.7 16-16c.3-.3 .6-.6 1-1L385.9 192c-.3 .3-.6 .6-1 1l-16 16L241 337l-17 17-17-17-64-64c-5.3-5.3-10.7-10.7-16-16l-1-1z" />
        <path class="fill-current text-slate-50"
          d="M385 193L241 337l-17 17-17-17-80-80L161 223l63 63L351 159 385 193z" />
      </svg>
      }
    </button>
    <button (click)="onThemeChange('OS'); closeThemeMenu()"
      class="group flex items-center w-full px-4 py-4 gap-4 dark:hover:bg-slate-300/30 hover:bg-slate-200/40 transition-colors duration-300"
      [ngClass]="{
          'bg-slate-200 dark:bg-slate-500': themeManager.chosenTheme() === 'OS',
        }">
      @if (themeManager.isSystemDark) {
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 fill-current text-slate-400 dark:text-slate-100"
        viewBox="0 0 384 512">
        <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
        <path
          d="M223.5 32C100 32 0 132.3 0 256S100 480 223.5 480c60.6 0 115.5-24.2 155.8-63.4c5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6c-96.9 0-175.5-78.8-175.5-176c0-65.8 36-123.1 89.3-153.3c6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z" />
      </svg>
      } @else {
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 512 512">
        <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
        <path class="fill-current text-light-accent-secondary dark:text-dark-accent-secondary"
          d="M208 256a48 48 0 1 0 96 0 48 48 0 1 0 -96 0z" />
        <path class="fill-current text-light-on-surface-secondary dark:text-slate-100"
          d="M232 88l0 24 48 0 0-24 0-64 0-24L232 0l0 24 0 64zm24 120a48 48 0 1 1 0 96 48 48 0 1 1 0-96zm0 144a96 96 0 1 0 0-192 96 96 0 1 0 0 192zM0 232l0 48 24 0 64 0 24 0 0-48-24 0-64 0L0 232zm424 0l-24 0 0 48 24 0 64 0 24 0 0-48-24 0-64 0zM232 512l48 0 0-24 0-64 0-24-48 0 0 24 0 64 0 24zM92 58L58 92l17 17 45.3 45.3 17 17 33.9-33.9-17-17L108.9 75 92 58zM391.8 357.8l-17-17-33.9 33.9 17 17L403.1 437l17 17L454 420l-17-17-45.3-45.3zM58 420L92 454l17-17 45.3-45.3 17-17-33.9-33.9-17 17L75 403.1 58 420zM357.8 120.2l-17 17 33.9 33.9 17-17L437 108.9l17-17L420 58l-17 17-45.3 45.3z" />
      </svg>
      }
      <span>Tema automatico</span>
      @if (themeManager.chosenTheme() === "OS") {
      <svg xmlns="http://www.w3.org/2000/svg" class="h4 w-4 relative left-2" viewBox="0 0 512 512">
        <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
        <path class="fill-current text-light-accent-secondary dark:text-dark-accent-secondary"
          d="M0 256a256 256 0 1 0 512 0A256 256 0 1 0 0 256zm126.1 0L160 222.1c.3 .3 .6 .6 1 1c5.3 5.3 10.7 10.7 16 16c15.7 15.7 31.4 31.4 47 47c37-37 74-74 111-111c5.3-5.3 10.7-10.7 16-16c.3-.3 .6-.6 1-1L385.9 192c-.3 .3-.6 .6-1 1l-16 16L241 337l-17 17-17-17-64-64c-5.3-5.3-10.7-10.7-16-16l-1-1z" />
        <path class="fill-current text-slate-50"
          d="M385 193L241 337l-17 17-17-17-80-80L161 223l63 63L351 159 385 193z" />
      </svg>
      }
    </button>
  </div>
</div>
}
<!-- Provider icon template (shared desktop + mobile avatar) -->
<ng-template #providerIcon let-provider="provider">
  @switch (provider) {
    @case ('Mercurion') {
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-5 text-light-accent-secondary dark:text-dark-accent-primary">
        <path d="M240 192C240 147.8 275.8 112 320 112C364.2 112 400 147.8 400 192C400 236.2 364.2 272 320 272C275.8 272 240 236.2 240 192zM146.2 576L195.4 416L444.5 416L493.7 576L543.9 576L479.9 368L159.9 368L95.9 576L146.1 576zM320 320C390.7 320 448 262.7 448 192C448 121.3 390.7 64 320 64C249.3 64 192 121.3 192 192C192 262.7 249.3 320 320 320z" />
      </svg>
    }
    @case ('Google') {
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-5 text-light-accent-secondary dark:text-dark-accent-primary">
        <path d="M564 325.8C564 467.3 467.1 568 324 568C186.8 568 76 457.2 76 320C76 182.8 186.8 72 324 72C390.8 72 447 96.5 490.3 136.9L422.8 201.8C334.5 116.6 170.3 180.6 170.3 320C170.3 406.5 239.4 476.6 324 476.6C422.2 476.6 459 406.2 464.8 369.7L324 369.7L324 284.4L560.1 284.4C562.4 297.1 564 309.3 564 325.8z"/>
      </svg>
    }
    @case ('LinkedIn') {
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-5 text-light-accent-secondary dark:text-dark-accent-primary">
        <path d="M160 96C124.7 96 96 124.7 96 160L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 160C544 124.7 515.3 96 480 96L160 96zM165 266.2L231.5 266.2L231.5 480L165 480L165 266.2zM236.7 198.5C236.7 219.8 219.5 237 198.2 237C176.9 237 159.7 219.8 159.7 198.5C159.7 177.2 176.9 160 198.2 160C219.5 160 236.7 177.2 236.7 198.5zM413.9 480L413.9 376C413.9 351.2 413.4 319.3 379.4 319.3C344.8 319.3 339.5 346.3 339.5 374.2L339.5 480L273.1 480L273.1 266.2L336.8 266.2L336.8 295.4L337.7 295.4C346.6 278.6 368.3 260.9 400.6 260.9C467.8 260.9 480.3 305.2 480.3 362.8L480.3 480L413.9 480z"/>
      </svg>
    }
    @case ('GitHub') {
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-5 text-light-accent-secondary dark:text-dark-accent-primary">
        <path d="M237.9 461.4C237.9 463.4 235.6 465 232.7 465C229.4 465.3 227.1 463.7 227.1 461.4C227.1 459.4 229.4 457.8 232.3 457.8C235.3 457.5 237.9 459.1 237.9 461.4zM206.8 456.9C206.1 458.9 208.1 461.2 211.1 461.8C213.7 462.8 216.7 461.8 217.3 459.8C217.9 457.8 216 455.5 213 454.6C210.4 453.9 207.5 454.9 206.8 456.9zM251 455.2C248.1 455.9 246.1 457.8 246.4 460.1C246.7 462.1 249.3 463.4 252.3 462.7C255.2 462 257.2 460.1 256.9 458.1C256.6 456.2 253.9 454.9 251 455.2zM316.8 72C178.1 72 72 177.3 72 316C72 426.9 141.8 521.8 241.5 555.2C254.3 557.5 258.8 549.6 258.8 543.1C258.8 536.9 258.5 502.7 258.5 481.7C258.5 481.7 188.5 496.7 173.8 451.9C173.8 451.9 162.4 422.8 146 415.3C146 415.3 123.1 399.6 147.6 399.9C147.6 399.9 172.5 401.9 186.2 425.7C208.1 464.3 244.8 453.2 259.1 446.6C261.4 430.6 267.9 419.5 275.1 412.9C219.2 406.7 162.8 398.6 162.8 302.4C162.8 274.9 170.4 261.1 186.4 243.5C183.8 237 175.3 210.2 189 175.6C209.9 169.1 258 202.6 258 202.6C278 197 299.5 194.1 320.8 194.1C342.1 194.1 363.6 197 383.6 202.6C383.6 202.6 431.7 169 452.6 175.6C466.3 210.3 457.8 237 455.2 243.5C471.2 261.2 481 275 481 302.4C481 398.9 422.1 406.6 366.2 412.9C375.4 420.8 383.2 435.8 383.2 459.3C383.2 493 382.9 534.7 382.9 542.9C382.9 549.4 387.5 557.3 400.2 555C500.2 521.8 568 426.9 568 316C568 177.3 455.5 72 316.8 72zM169.2 416.9C167.9 417.9 168.2 420.2 169.9 422.1C171.5 423.7 173.8 424.4 175.1 423.1C176.4 422.1 176.1 419.8 174.4 417.9C172.8 416.3 170.5 415.6 169.2 416.9zM158.4 408.8C157.7 410.1 158.7 411.7 160.7 412.7C162.3 413.7 164.3 413.4 165 412C165.7 410.7 164.7 409.1 162.7 408.1C160.7 407.5 159.1 407.8 158.4 408.8zM190.8 444.4C189.2 445.7 189.8 448.7 192.1 450.6C194.4 452.9 197.3 453.2 198.6 451.6C199.9 450.3 199.3 447.3 197.3 445.4C195.1 443.1 192.1 442.8 190.8 444.4zM179.4 429.7C177.8 430.7 177.8 433.3 179.4 435.6C181 437.9 183.7 438.9 185 437.9C186.6 436.6 186.6 434 185 431.7C183.6 429.4 181 428.4 179.4 429.7z"/>
      </svg>
    }
    @case ('Discord') {
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-5 text-light-accent-secondary dark:text-dark-accent-primary">
        <path d="M524.5 133.8C524.3 133.5 524.1 133.2 523.7 133.1C485.6 115.6 445.3 103.1 404 96C403.6 95.9 403.2 96 402.9 96.1C402.6 96.2 402.3 96.5 402.1 96.9C396.6 106.8 391.6 117.1 387.2 127.5C342.6 120.7 297.3 120.7 252.8 127.5C248.3 117 243.3 106.8 237.7 96.9C237.5 96.6 237.2 96.3 236.9 96.1C236.6 95.9 236.2 95.9 235.8 95.9C194.5 103 154.2 115.5 116.1 133C115.8 133.1 115.5 133.4 115.3 133.7C39.1 247.5 18.2 358.6 28.4 468.2C28.4 468.5 28.5 468.7 28.6 469C28.7 469.3 28.9 469.4 29.1 469.6C73.5 502.5 123.1 527.6 175.9 543.8C176.3 543.9 176.7 543.9 177 543.8C177.3 543.7 177.7 543.4 177.9 543.1C189.2 527.7 199.3 511.3 207.9 494.3C208 494.1 208.1 493.8 208.1 493.5C208.1 493.2 208.1 493 208 492.7C207.9 492.4 207.8 492.2 207.6 492.1C207.4 492 207.2 491.8 206.9 491.7C191.1 485.6 175.7 478.3 161 469.8C160.7 469.6 160.5 469.4 160.3 469.2C160.1 469 160 468.6 160 468.3C160 468 160 467.7 160.2 467.4C160.4 467.1 160.5 466.9 160.8 466.7C163.9 464.4 167 462 169.9 459.6C170.2 459.4 170.5 459.2 170.8 459.2C171.1 459.2 171.5 459.2 171.8 459.3C268 503.2 372.2 503.2 467.3 459.3C467.6 459.2 468 459.1 468.3 459.1C468.6 459.1 469 459.3 469.2 459.5C472.1 461.9 475.2 464.4 478.3 466.7C478.5 466.9 478.7 467.1 478.9 467.4C479.1 467.7 479.1 468 479.1 468.3C479.1 468.6 479 468.9 478.8 469.2C478.6 469.5 478.4 469.7 478.2 469.8C463.5 478.4 448.2 485.7 432.3 491.6C432.1 491.7 431.8 491.8 431.6 492C431.4 492.2 431.3 492.4 431.2 492.7C431.1 493 431.1 493.2 431.1 493.5C431.1 493.8 431.2 494 431.3 494.3C440.1 511.3 450.1 527.6 461.3 543.1C461.5 543.4 461.9 543.7 462.2 543.8C462.5 543.9 463 543.9 463.3 543.8C516.2 527.6 565.9 502.5 610.4 469.6C610.6 469.4 610.8 469.2 610.9 469C611 468.8 611.1 468.5 611.1 468.2C623.4 341.4 590.6 231.3 524.2 133.7zM222.5 401.5C193.5 401.5 169.7 374.9 169.7 342.3C169.7 309.7 193.1 283.1 222.5 283.1C252.2 283.1 275.8 309.9 275.3 342.3C275.3 375 251.9 401.5 222.5 401.5zM417.9 401.5C388.9 401.5 365.1 374.9 365.1 342.3C365.1 309.7 388.5 283.1 417.9 283.1C447.6 283.1 471.2 309.9 470.7 342.3C470.7 375 447.5 401.5 417.9 401.5z"/>
      </svg>
    }
  }
</ng-template>
<!-- Menu avatar -->
@if (avatarMenuMounted() && designService.minBk('sm')()) {
<div
  class="avatar-menu-container absolute xs:right-9 md:right-12 mt-2 z-50 w-72 text-md rounded-md shadow-lg bg-white text-light-on-surface-main dark:text-slate-100 dark:bg-neutral-800 transform transition-all duration-300 ease-out"
  [ngClass]="{
      'opacity-100 translate-x-0 translate-y-0': avatarMenuVisible(),
      'opacity-0 pointer-events-none translate-x-2 -translate-y-2':
        !avatarMenuVisible(),
    }">
  <div class="z-[999]">
    <button
      class="group truncate flex items-center w-full mb-2 pl-4 pr-6 py-4 gap-4 transition-colors duration-300 cursor-default border-slate-400/60 dark:border-slate-300 border-b-[0.5px]">
        <ng-container [ngTemplateOutlet]="providerIcon" [ngTemplateOutletContext]="{ provider: providedEmail()?.provider }" />
      <span class="text-sm text-green-900 dark:text-dark-accent-primary font-medium truncate">{{ providedEmail()?.email }}</span>
    </button>
    <a routerLink="/dashboard" (click)="closeAvatarMenu()"
      class="group flex items-center w-full pl-4 pr-6 py-3 gap-4 dark:hover:bg-slate-300/30 hover:bg-slate-300/50 transition-colors duration-300"
      [ngClass]="{ 'bg-slate-200 dark:bg-slate-500': isAvatarMenuItemActive('/dashboard') }">

      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
        class="fill-current h-5 w-5 text-gray-600 dark:text-slate-200 ">
        <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
        <path
          d="M64 128L64 192L576 192L576 128L64 128zM32 208L32 96L608 96L608 544L32 544L32 208zM576 224L64 224L64 512L117.3 512L144 432L304 432L330.7 512L576 512L576 224zM296.9 512L280.9 464L167 464L151 512L296.9 512zM224 368C241.7 368 256 353.7 256 336C256 318.3 241.7 304 224 304C206.3 304 192 318.3 192 336C192 353.7 206.3 368 224 368zM224 272C259.3 272 288 300.7 288 336C288 371.3 259.3 400 224 400C188.7 400 160 371.3 160 336C160 300.7 188.7 272 224 272zM368 288L528 288L528 320L368 320L368 288zM368 384L528 384L528 416L368 416L368 384z" />
      </svg>
      <span>Dashboard</span>
    </a>
    <a (click)="closeAvatarMenu()" routerLink="/settings"
      class="group flex items-center w-full pl-4 pr-6 py-3 gap-4 dark:hover:bg-slate-300/30 hover:bg-slate-300/50 transition-colors duration-300"
      [ngClass]="{ 'bg-slate-200 dark:bg-slate-500': isAvatarMenuItemActive('/settings') }">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
        class="fill-current h-5 w-5 text-gray-600 dark:text-slate-200 ">
        <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
        <path
          d="M384.1 48L404.6 147.5C412.4 151.3 420 155.7 427.2 160.6L523.7 128.6L587.7 239.5L511.7 307C512.3 315.6 512.3 324.5 511.7 333L587.7 400.5L523.7 511.4L427.2 479.4C420 484.2 412.5 488.6 404.6 492.5L384.1 592L256.1 592L235.6 492.5C227.8 488.7 220.2 484.3 213 479.4L116.5 511.4L52.5 400.5L128.5 333C127.9 324.4 127.9 315.5 128.5 307L52.5 239.4L116.5 128.5L213 160.5C220.2 155.7 227.7 151.3 235.6 147.4L256.1 47.9L384.1 47.9zM437.3 191L422.4 196L409.4 187.2C403.4 183.2 397.1 179.5 390.6 176.3L376.5 169.4L373.3 154L358.1 80L282.3 80C270.1 139.1 264 168.9 263.9 169.4L249.8 176.3C243.3 179.5 237 183.1 231 187.2L218 196C217.5 195.8 188.7 186.3 131.4 167.2L93.3 232.8C138.4 272.9 161.2 293.1 161.5 293.4L160.5 309C160 316.2 160 323.6 160.5 330.8L161.5 346.4L149.8 356.8L93.3 407L131.2 472.7L202.9 448.9L217.8 443.9L230.8 452.7C236.8 456.7 243.1 460.4 249.6 463.6L263.7 470.5C263.8 471 269.9 500.7 282.1 559.9L357.9 559.9L373.1 485.9L376.3 470.5L390.4 463.6C396.9 460.4 403.2 456.8 409.2 452.7L422.2 443.9L437.1 448.9L508.8 472.7L546.7 407L490.2 356.8L478.5 346.4L479.5 330.8C480 323.6 480 316.2 479.5 309L478.5 293.4L490.2 283L546.7 232.8L508.8 167.1L437.1 190.9zM264.1 320C264.1 350.9 289.1 376 320.1 376C351 376 376 350.9 376 320C376 289.1 351 264.1 320.1 264.1C289.1 264.1 264.1 289.1 264.1 320zM320 408C271.4 408 232 368.6 232.1 320C232.1 271.3 271.5 232 320.1 232C368.7 232 408.1 271.4 408.1 320.1C408 368.7 368.6 408 320 408z" />
      </svg>
      <span>Impostazioni</span>
    </a>
    <a (click)="closeAvatarMenu()"
      routerLink="/help"
      class="group flex items-center w-full pl-4 pr-6 py-3 gap-4 dark:hover:bg-slate-300/30 hover:bg-slate-300/50 transition-colors duration-300"
      [ngClass]="{ 'bg-slate-200 dark:bg-slate-500': isAvatarMenuItemActive('/help') }">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
        class="fill-current h-5 w-5 text-gray-600 dark:text-slate-200 ">
        <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
        <path
          d="M152.6 443.4C150.9 447.6 140.1 474.1 120.2 522.9L206.1 493.4L217.6 489.5L228.8 494.1C256.6 505.6 287.4 512.1 320 512.1C445.7 512.1 544 417.1 544 304.1C544 191.1 445.7 96 320 96C194.3 96 96 191 96 304C96 350.6 112.5 393.8 140.7 428.7L152.6 443.4zM104.2 562.2L64 576C71.4 557.9 88.7 515.4 115.8 448.8C83.3 408.6 64 358.4 64 304C64 171.5 178.6 64 320 64C461.4 64 576 171.5 576 304C576 436.5 461.4 544 320 544C283.2 544 248.1 536.7 216.5 523.6L104.2 562.2z" />
      </svg>
      <span>Supporto</span>
    </a>
    <a routerLink="/feedback"
      (click)="closeAvatarMenu()"
      class="group flex items-center w-full mb-2 pl-4 pr-6 py-3 gap-4 dark:hover:bg-slate-300/30 hover:bg-slate-300/50 transition-colors duration-300"
      [ngClass]="{ 'bg-slate-200 dark:bg-slate-500': isAvatarMenuItemActive('/feedback') }">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-5 text-gray-600 dark:text-slate-200">
        <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
        <path d="M416 64L416 144L496 144L496 176L416 176L416 256L384 256L384 176L304 176L304 144L384 144L384 64L416 64zM528 224L528 272L576 272L576 304L528 304L528 352L496 352L496 304L448 304L448 272L496 272L496 224L528 224zM275.3 244.2L317.2 329.2C388.7 339.6 433.3 346.1 450.9 348.6C438.2 361 405.9 392.5 354.2 442.9C366.4 514.1 374 558.5 377 576C361.2 567.7 321.4 546.8 257.4 513.1C193.4 546.7 153.6 567.7 137.8 576C140.8 558.5 148.4 514.1 160.6 442.9C108.9 392.5 76.6 361 63.9 348.6C81.5 346 126.1 339.6 197.6 329.2C229.6 264.4 249.5 224 257.4 208.1L275.2 244.3zM312.6 360.9L296 358.4C295 356.3 282.1 330.3 257.5 280.3C232.8 330.3 220 356.3 219 358.4C216.7 358.7 188 362.9 132.8 370.9C172.7 409.8 193.5 430.1 195.2 431.7C194.8 434 189.9 462.6 180.5 517.5C229.8 491.6 255.5 478.1 257.6 477C259.6 478.1 285.3 491.6 334.7 517.5C325.3 462.6 320.4 434 320 431.7C321.7 430.1 342.4 409.8 382.4 370.9L312.9 360.8z" />
      </svg>
      <span>Feedback</span>
    </a>
    <div
      class="hover:bg-slate-200/40 transition-colors duration-300 border-t-slate-400/60 dark:border-slate-300 border-t-[0.5px]">
    </div>
    <button (click)="logout(); closeAvatarMenu()"
      class="group flex items-center w-full my-1 pl-4 pr-6 py-3 gap-4 hover:bg-slate-300/50 transition-colors duration-300 dark:hover:bg-slate-300/30">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
        class="fill-current h-5 w-5 text-gray-600 dark:text-slate-200">
        <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
        <path
          d="M416.5 384L416.5 352L256.5 352L256.5 288L416.5 288L416.5 202.6L540.8 320L416.5 437.4L416.5 384zM224.5 384L384.5 384L384.5 511.7C418.6 479.5 443.2 456.3 564.2 342C565.1 341.1 572.9 333.8 587.5 320C577.6 310.7 543.9 278.8 425 166.6C423.3 165 409.8 152.2 384.5 128.4L384.5 256.1L224.5 256.1L224.5 384.1zM240.5 128L256.5 128L256.5 96L64.5 96L64.5 544L256.5 544L256.5 512L96.5 512L96.5 128L240.5 128z" />
      </svg>
      <span>Esci</span>
    </button>
  </div>
</div>
}
<!-- Offcanvas backdrop -->
@if (offCanvasMenuOpen()) {
  <div class="fixed inset-0 z-[9998] bg-black/30 transition-opacity duration-300" (click)="closeOffCanvasMenu()"></div>
}

<!-- Offcanvas Navigation Sidebar -->
@if (designService.maxBk("lg")()) {
<div
  class="off-canvas-menu-container offcanvas-menu-container fixed top-0 left-0 h-full z-[9999] bg-slate-200 dark:bg-neutral-900 shadow-lg transform transition-transform duration-300 ease-in-out w-full 2xs:w-[74%] xs:w-[64%] sm:w-[50%] md:w-[40%] lg:w-[40%] xl:w-[30%] -translate-x-full"
  [ngClass]="{
      'translate-x-0': offCanvasMenuOpen(),
      '-translate-x-full': !offCanvasMenuOpen(),
    }">
  <!-- Header of the offcanvas -->
  <div class="flex justify-between items-center px-4 border-b py-[18px] border-slate-300 dark:border-dark-border">
    <div class="flex items-center gap-4">
      <a routerLink="/">
        <img [ngSrc]="pictogramLogo() | public" alt="Pittogramma Logo di Mercurion" width="186" height="234" class="w-auto h-[30px] contrast-115" />
      </a>
      <span class="text-lg">Mercurion</span>
    </div>
    <button
      class="inline-flex items-center justify-center size-8 rounded-md text-slate-700 hover:text-light-accent-primary-hq hover:bg-slate-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-light-accent-primary-hq focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-transparent transition"
      (click)="closeOffCanvasMenu()">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 640 640"
        class="fill-current w-5 h-auto">
          <path d="M182.9 137.4L160.3 114.7L115 160L137.6 182.6L275 320L137.6 457.4L115 480L160.3 525.3L182.9 502.6L320.3 365.3L457.6 502.6L480.3 525.3L525.5 480L502.9 457.4L365.5 320L502.9 182.6L525.5 160L480.3 114.7L457.6 137.4L320.3 274.7L182.9 137.4z" />
      </svg>
    </button>
  </div>

  <!-- Menu items -->
  <m-sidenav (menuItemClick)="closeOffCanvasMenu()" />

  <!-- Sezione avatar -->
  @if (userContext.isLoggedIn() && designService.maxBk("sm")()) {
  <div
    class="sticky bottom-0 border-t py-3 px-5 bg-slate-100 dark:bg-neutral-800 border-slate-400 dark:border-dark-border flex gap-3 items-center">
    <button (click)="toggleAvatarMobileMenu()" [innerHTML]="userContext.initials()"
      class="avatar-toggle-button inline-flex items-center justify-center size-10 rounded-full cursor-pointer bg-emerald-500 text-slate-100 dark:bg-dark-accent-primary-btn hover:bg-emerald-900/60 hover:text-slate-100 dark:hover:bg-blue-400/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-accent-primary-hq text-sm font-semibold transition-colors duration-300"
      [attr.title]="avatarMobileMenuOpen() ? 'Chiudi il menù utente' : 'Apri il menu utente'">
    </button>
    <button (click)="toggleAvatarMobileMenu()"
      class="text-sm text-green-800 dark:text-dark-accent-primary font-medium truncate">
      {{ providedEmail()?.email }}
    </button>
  </div>
  }
  <!-- Modal avatar mobile (solo <= sm) -->
  @if (avatarMobileMenuMounted() && userContext.isLoggedIn()) {
  <div class="fixed inset-0 z-[10000] bg-black/50 flex items-end sm:hidden transition-opacity duration-300"
       [ngClass]="{
          'opacity-100 pointer-events-auto': avatarMobileMenuVisible(),
          'opacity-0 pointer-events-none': !avatarMobileMenuVisible(),
        }" (click)="closeAvatarMobileMenu()">
    <div
      class="w-full h-[100dvh] max-h-[100dvh] bg-slate-100 dark:bg-neutral-900 rounded-t-2xl shadow-2xl p-6 pb-10 relative overflow-y-auto transition-transform duration-300"
      [ngClass]="{
            'translate-y-0': avatarMobileMenuVisible(),
            'translate-y-full': !avatarMobileMenuVisible(),
          }" (click)="$event.stopPropagation()">
      <button class="absolute top-3 right-6 text-2xl" (click)="closeAvatarMobileMenu()">
        ✕
      </button>
      <div class="z-[999]">
        <!-- Header -->
        <button
          class="group flex items-center w-full mb-2 pl-3 pr-6 py-4 gap-4 transition-colors duration-300 cursor-default border-b-slate-400/60 dark:border-slate-300 border-b-[0.5px]">
          <ng-container [ngTemplateOutlet]="providerIcon" [ngTemplateOutletContext]="{ provider: providedEmail()?.provider }" />
          <span class="text-sm text-green-900 dark:text-dark-accent-primary font-medium truncate">
            {{ providedEmail()?.email }}
          </span>
        </button>
        <!-- Profilo -->
        <a routerLink="/dashboard" (click)="closeAvatarMobileMenu(); closeOffCanvasMenu()"
          class="group flex items-center w-full pl-3 pr-6 py-3 gap-4 dark:hover:bg-slate-300/30 hover:bg-slate-300/50 transition-colors duration-300"
          [ngClass]="{ 'bg-slate-200 dark:bg-slate-500': isAvatarMenuItemActive('/dashboard') }">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
            class="fill-current h-5 w-5 text-gray-600 dark:text-slate-200 ">
            <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
            <path
              d="M64 128L64 192L576 192L576 128L64 128zM32 208L32 96L608 96L608 544L32 544L32 208zM576 224L64 224L64 512L117.3 512L144 432L304 432L330.7 512L576 512L576 224zM296.9 512L280.9 464L167 464L151 512L296.9 512zM224 368C241.7 368 256 353.7 256 336C256 318.3 241.7 304 224 304C206.3 304 192 318.3 192 336C192 353.7 206.3 368 224 368zM224 272C259.3 272 288 300.7 288 336C288 371.3 259.3 400 224 400C188.7 400 160 371.3 160 336C160 300.7 188.7 272 224 272zM368 288L528 288L528 320L368 320L368 288zM368 384L528 384L528 416L368 416L368 384z" />
          </svg>

          <span>Dashboard</span>
        </a>
        <!-- Impostazioni -->
        <a (click)="closeAvatarMobileMenu(); closeOffCanvasMenu()" routerLink="/settings"
          class="group flex items-center w-full pl-3 pr-6 py-3 gap-4 dark:hover:bg-slate-300/30 hover:bg-slate-300/50 transition-colors duration-300"
          [ngClass]="{ 'bg-slate-200 dark:bg-slate-500': isAvatarMenuItemActive('/settings') }">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
            class="fill-current h-5 w-5 text-gray-600 dark:text-slate-200 ">
            <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
            <path
              d="M384.1 48L404.6 147.5C412.4 151.3 420 155.7 427.2 160.6L523.7 128.6L587.7 239.5L511.7 307C512.3 315.6 512.3 324.5 511.7 333L587.7 400.5L523.7 511.4L427.2 479.4C420 484.2 412.5 488.6 404.6 492.5L384.1 592L256.1 592L235.6 492.5C227.8 488.7 220.2 484.3 213 479.4L116.5 511.4L52.5 400.5L128.5 333C127.9 324.4 127.9 315.5 128.5 307L52.5 239.4L116.5 128.5L213 160.5C220.2 155.7 227.7 151.3 235.6 147.4L256.1 47.9L384.1 47.9zM437.3 191L422.4 196L409.4 187.2C403.4 183.2 397.1 179.5 390.6 176.3L376.5 169.4L373.3 154L358.1 80L282.3 80C270.1 139.1 264 168.9 263.9 169.4L249.8 176.3C243.3 179.5 237 183.1 231 187.2L218 196C217.5 195.8 188.7 186.3 131.4 167.2L93.3 232.8C138.4 272.9 161.2 293.1 161.5 293.4L160.5 309C160 316.2 160 323.6 160.5 330.8L161.5 346.4L149.8 356.8L93.3 407L131.2 472.7L202.9 448.9L217.8 443.9L230.8 452.7C236.8 456.7 243.1 460.4 249.6 463.6L263.7 470.5C263.8 471 269.9 500.7 282.1 559.9L357.9 559.9L373.1 485.9L376.3 470.5L390.4 463.6C396.9 460.4 403.2 456.8 409.2 452.7L422.2 443.9L437.1 448.9L508.8 472.7L546.7 407L490.2 356.8L478.5 346.4L479.5 330.8C480 323.6 480 316.2 479.5 309L478.5 293.4L490.2 283L546.7 232.8L508.8 167.1L437.1 190.9zM264.1 320C264.1 350.9 289.1 376 320.1 376C351 376 376 350.9 376 320C376 289.1 351 264.1 320.1 264.1C289.1 264.1 264.1 289.1 264.1 320zM320 408C271.4 408 232 368.6 232.1 320C232.1 271.3 271.5 232 320.1 232C368.7 232 408.1 271.4 408.1 320.1C408 368.7 368.6 408 320 408z" />
          </svg>
          <span>Impostazioni</span>
        </a>
        <!-- Assistenza -->
        <a (click)="closeAvatarMobileMenu(); closeOffCanvasMenu()"
          routerLink="/help"
          class="group flex items-center w-full pl-3 pr-6 py-3 gap-4 dark:hover:bg-slate-300/30 hover:bg-slate-300/50 transition-colors duration-300"
          [ngClass]="{ 'bg-slate-200 dark:bg-slate-500': isAvatarMenuItemActive('/help') }">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
            class="fill-current h-5 w-5 text-gray-600 dark:text-slate-200 ">
            <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
            <path
              d="M152.6 443.4C150.9 447.6 140.1 474.1 120.2 522.9L206.1 493.4L217.6 489.5L228.8 494.1C256.6 505.6 287.4 512.1 320 512.1C445.7 512.1 544 417.1 544 304.1C544 191.1 445.7 96 320 96C194.3 96 96 191 96 304C96 350.6 112.5 393.8 140.7 428.7L152.6 443.4zM104.2 562.2L64 576C71.4 557.9 88.7 515.4 115.8 448.8C83.3 408.6 64 358.4 64 304C64 171.5 178.6 64 320 64C461.4 64 576 171.5 576 304C576 436.5 461.4 544 320 544C283.2 544 248.1 536.7 216.5 523.6L104.2 562.2z" />
          </svg>
          <span>Supporto</span>
        </a>
        <!-- Feedback -->
        <a routerLink="/feedback"
          (click)="closeAvatarMobileMenu(); closeOffCanvasMenu()"
          class="group flex items-center w-full mb-2 pl-3 pr-6 py-3 gap-4 dark:hover:bg-slate-300/30 hover:bg-slate-300/50 transition-colors duration-300"
          [ngClass]="{ 'bg-slate-200 dark:bg-slate-500': isAvatarMenuItemActive('/feedback') }">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
            class="fill-current h-5 w-5 text-gray-600 dark:text-slate-200">
            <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
            <path
              d="M416 64L416 144L496 144L496 176L416 176L416 256L384 256L384 176L304 176L304 144L384 144L384 64L416 64zM528 224L528 272L576 272L576 304L528 304L528 352L496 352L496 304L448 304L448 272L496 272L496 224L528 224zM275.3 244.2L317.2 329.2C388.7 339.6 433.3 346.1 450.9 348.6C438.2 361 405.9 392.5 354.2 442.9C366.4 514.1 374 558.5 377 576C361.2 567.7 321.4 546.8 257.4 513.1C193.4 546.7 153.6 567.7 137.8 576C140.8 558.5 148.4 514.1 160.6 442.9C108.9 392.5 76.6 361 63.9 348.6C81.5 346 126.1 339.6 197.6 329.2C229.6 264.4 249.5 224 257.4 208.1L275.2 244.3zM312.6 360.9L296 358.4C295 356.3 282.1 330.3 257.5 280.3C232.8 330.3 220 356.3 219 358.4C216.7 358.7 188 362.9 132.8 370.9C172.7 409.8 193.5 430.1 195.2 431.7C194.8 434 189.9 462.6 180.5 517.5C229.8 491.6 255.5 478.1 257.6 477C259.6 478.1 285.3 491.6 334.7 517.5C325.3 462.6 320.4 434 320 431.7C321.7 430.1 342.4 409.8 382.4 370.9L312.9 360.8z" />
          </svg>
          <span>Feedback</span>
        </a>
        <div
          class="hover:bg-slate-200/40 transition-colors duration-300 border-slate-400/60 dark:border-slate-300 border-t-[0.5px]">
        </div>
        <!-- Esci -->
        <button (click)="logout(); closeAvatarMobileMenu(); closeOffCanvasMenu()"
          class="group flex items-center w-full my-1 pl-3 pr-6 py-3 gap-4 hover:bg-slate-300/50 transition-colors duration-300 dark:hover:bg-slate-300/30">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
            class="fill-current h-5 w-5 text-gray-600 dark:text-slate-200">
            <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
            <path
              d="M416.5 384L416.5 352L256.5 352L256.5 288L416.5 288L416.5 202.6L540.8 320L416.5 437.4L416.5 384zM224.5 384L384.5 384L384.5 511.7C418.6 479.5 443.2 456.3 564.2 342C565.1 341.1 572.9 333.8 587.5 320C577.6 310.7 543.9 278.8 425 166.6C423.3 165 409.8 152.2 384.5 128.4L384.5 256.1L224.5 256.1L224.5 384.1zM240.5 128L256.5 128L256.5 96L64.5 96L64.5 544L256.5 544L256.5 512L96.5 512L96.5 128L240.5 128z" />
          </svg>
          <span>Esci</span>
        </button>
      </div>
    </div>
  </div>
  }
</div>
}


  `
})
export class HeaderComponent implements OnInit, OnDestroy {

  protected readonly themeManager = inject(ThemeManagerService)
  protected readonly designService = inject(DesignService)
  protected readonly searchContextService = inject(SearchContextService)
  protected readonly sessionSync = inject(SessionSyncService)
  private readonly router = inject(Router)
  private accountService = inject(AccountService)
  private readonly authService = inject(AuthService)
  protected readonly userContext = inject(UserContextService)
  protected readonly pathService = inject(PathService)
  private readonly toast = inject(ToastService)
  private readonly appContext = inject(AppContextService)

  @Input()
  set triggerOpenOffCanvas(triggerOpenOffCanvas: boolean) {
    this._triggerOpenOffCanvas.set(triggerOpenOffCanvas)
  }

  @Output()
  onOffCanvasMenuOpen = new EventEmitter<boolean>()

  private routeSub?: Subscription
  private emailSub?: Subscription
  private logoutSub?: Subscription

  protected isLoginPath = signal<boolean>(true)
  protected isRegisterPath = signal<boolean>(false)
  protected isAllowedPath = signal<boolean>(false)
  protected themeMenuOpen = signal<boolean>(false)
  protected themeMenuMounted = signal<boolean>(false)
  protected themeMenuVisible = signal<boolean>(false)
  protected offCanvasMenuOpen = signal<boolean>(false)
  protected avatarMenuOpen = signal<boolean>(false)
  protected avatarMenuMounted = signal<boolean>(false)
  protected avatarMenuVisible = signal<boolean>(false)
  protected avatarMobileMenuOpen = signal<boolean>(false)
  protected avatarMobileMenuMounted = signal<boolean>(false)
  protected avatarMobileMenuVisible = signal<boolean>(false)
  protected providedEmail = signal<ProvidedEmailDTO | null>(null)
  private _triggerOpenOffCanvas = signal<boolean>(false)

  readonly menuOpenClass: Signal<boolean> = computed(() => this.themeMenuOpen())
  readonly logoSrc = computed(() =>
    this.themeManager.theme() === 'light' ? 'logo/complete-light-logo.svg' : 'logo/complete-dark-logo-2.svg'
  )

  pictogramLogo = computed<string>(() => {
    const { PICTOGRAM_LIGHT, PICTOGRAM_DARK } = environment.logoSrc
    return this.themeManager.theme() === 'light' ? PICTOGRAM_LIGHT : PICTOGRAM_DARK
  })


  constructor() {
    effect(() => {
      const t = this.appContext.addedTriggerCloseOffCanvasMenu()
      if (t === 0) {
        return
      }
      queueMicrotask(() => this.closeOffCanvasMenu())
    })
    effect(() => {
      const t = this._triggerOpenOffCanvas()
      if (!t) {
        return
      }
      this.offCanvasMenuOpen.set(true)
      this.onOffCanvasMenuOpen.emit(true)
    })
    effect(() => {
      if (this.themeMenuOpen()) {
        this.themeMenuMounted.set(true)
        setTimeout(() => this.themeMenuVisible.set(true))
      } else {
        this.themeMenuVisible.set(false)
        setTimeout(() => this.themeMenuMounted.set(false), 200)
      }
    })
    effect(() => {
      if (this.avatarMenuOpen()) {
        this.avatarMenuMounted.set(true)
        setTimeout(() => this.avatarMenuVisible.set(true))
      } else {
        this.avatarMenuVisible.set(false)
        setTimeout(() => this.avatarMenuMounted.set(false), 200)
      }
    })
    effect(() => {
      if (this.avatarMobileMenuOpen()) {
        this.avatarMobileMenuMounted.set(true)
        setTimeout(() => this.avatarMobileMenuVisible.set(true))
      } else {
        this.avatarMobileMenuVisible.set(false)
        setTimeout(() => this.avatarMobileMenuMounted.set(false), 200)
      }
    })
  }

  protected onThemeChange(theme: ThemeChoice): void {
    queueMicrotask(() => {
      this.themeManager.chooseTheme(theme)
      console.log(this.themeManager.theme())
    })
  }

  protected toggleThemeMenu(): void {
    this.themeMenuOpen.update(open => !open)
  }

  protected toggleOffCanvasMenu(): void {
    this.getProvidedEmail()
    this.offCanvasMenuOpen.update(open => !open)
  }

  protected toggleAvatarMenu(): void {
    !this.avatarMenuOpen() && this.getProvidedEmail()
    this.themeMenuOpen() && this.toggleThemeMenu()
    this.avatarMenuOpen.update(open => !open)
  }

  protected toggleAvatarMobileMenu(): void {
    !this.avatarMobileMenuOpen() && this.getProvidedEmail()
    this.themeMenuOpen() && this.toggleThemeMenu()
    this.avatarMobileMenuOpen.update(open => !open)
  }

  protected closeOffCanvasMenu(): void {
    this.offCanvasMenuOpen.set(false)
  }

  protected closeThemeMenu(): void {
    this.themeMenuOpen.set(false)
  }

  protected closeAvatarMenu(): void {
    this.avatarMenuOpen.set(false)
  }

  protected closeAvatarMobileMenu(): void {
    this.avatarMobileMenuOpen.set(false)
  }

  protected isAvatarMenuItemActive(pathPrefix: string): boolean {
    const normalizedPath = this.normalizePath(this.pathService.path())
    const normalizedPrefix = pathPrefix.startsWith('/') ? pathPrefix : `/${pathPrefix}`
    return normalizedPath === normalizedPrefix || normalizedPath.startsWith(`${normalizedPrefix}/`)
  }

  private normalizePath(path: string): string {
    return (path ?? '').split(/[?#;]/)[0]
  }

  protected noToast(): void {
    this.toast.close()
  }

  protected handleDocumentClick = (event: MouseEvent): void => {

    if (this.searchContextService.isOpenedSearchOverlay()) {
      return
    }

    if (this.avatarMobileMenuMounted()) {
      return
    }

    const target = event.target as HTMLElement

    const isInsideThemeMenu = target.closest('.theme-menu-container')
    const isInsideAvatarMenu = target.closest('.avatar-menu-container')
    const isInsideAvatarBtn = target.closest('.avatar-toggle-button')
    const isToggleThemeBtn = target.closest('.theme-toggle-button')
    const isInsideOffCanvasMenu = target.closest('.off-canvas-menu-container')
    const isToggleOffCanvasBtn = target.closest('.off-canvas-menu-button')

    if (!isInsideThemeMenu && !isToggleThemeBtn) {
      this.themeMenuOpen.set(false)
    }

    if (!isInsideOffCanvasMenu && !isToggleOffCanvasBtn) {
      this.offCanvasMenuOpen.set(false)
    }

    if (!isInsideAvatarMenu && !isInsideAvatarBtn) {
      this.avatarMenuOpen.set(false)
    }

  }

  protected handleEscape = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.themeMenuOpen.set(false)
      if (!this.searchContextService.isOpenedSearchOverlay()) {
        this.offCanvasMenuOpen.set(false)
      }
      this.avatarMenuOpen.set(false)
      this.avatarMobileMenuVisible.set(false)
    }
  }

  openSearchOverlay(): void {
    this.searchContextService.isOpenedSearchOverlay.set(true)
  }

  getProvidedEmail(): void {
    if (this.userContext.isLoggedIn()) {
      this.emailSub = this.accountService
        .getProvidedEmail()
        .subscribe((dto) => {
          this.providedEmail.set(dto)
        })
    }
  }

  logout(): void {
    this.logoutSub = this.authService.logout().subscribe({
      next: () => {
        this.sessionSync.notifyVoluntaryLogout()
        queueMicrotask(() => {
          this.sessionSync.logout()
          this.offCanvasMenuOpen.set(false)
          this.toast.trigger('Logout eseguito.', 'success', 3000)
        })
      },
      error: () => {
        sessionStorage?.removeItem('RouteError')
        this.sessionSync.logout()
        this.offCanvasMenuOpen.set(false)
      }
    })
  }

  ngOnInit(): void {
    document.addEventListener('click', this.handleDocumentClick, true)
    document.addEventListener('keydown', this.handleEscape, true)
    this.routeSub = this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd)
      )
      .subscribe((e: NavigationEnd) => {
        const currentPath = e.urlAfterRedirects
        const notAllowedPaths: string[] = ['/login', '/', '/test/spinner']
        this.isAllowedPath.set(!notAllowedPaths.includes(currentPath))
        this.isLoginPath.set(currentPath === '/login')
        this.isRegisterPath.set(currentPath === '/register')

      })

  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleDocumentClick, true)
    document.removeEventListener('keydown', this.handleEscape, true)
    this.routeSub?.unsubscribe()
    this.emailSub?.unsubscribe()
    this.logoutSub?.unsubscribe()
  }

}
