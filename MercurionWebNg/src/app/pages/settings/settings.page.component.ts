import { AfterViewInit, Component, inject, OnDestroy, OnInit, QueryList, signal, ViewChild, ViewChildren } from '@angular/core';
import { CdkAccordion, CdkAccordionItem, CdkAccordionModule } from '@angular/cdk/accordion';
import { EMPTY, Observable, of, startWith, Subscription, switchMap } from 'rxjs';
import { AccountService } from '../../services/account.service';
import { MfaStrategy, ProfileDTO, SessionDTOExt } from '../../Models/account/account.models';
import { ToastService } from '../../services/toast.service';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { Router } from '@angular/router';
import { SessionCardComponent } from '../../components/common/session-card/session-card.component';
import { AuthService } from '../../services/auth.service';
import { MfaStrategyCardComponent } from '../../components/common/mfa-strategy-card/mfa-strategy-card.component';
import { AppContextService } from '../../services/context/app-context.service';
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service';
import { SensitiveDataChangeContextService } from '../../services/context/action-context/sensitive-data-change-context.service';


@Component({
  selector: 'm-settings.page',
  imports: [CdkAccordionModule, ClassicSpinnerComponent, SessionCardComponent, MfaStrategyCardComponent],
  styles: `

    .accordion-body {
      overflow: hidden;
    }

    /* apertura */
    .accordion-enter {
      animation: accordion-down 300ms linear;
    }

    /* chiusura */
    .accordion-leave {
      animation: accordion-up 300ms linear forwards;
    }

    @keyframes accordion-down {
      from {
        transform: translateY(-4px);
        max-height: 0;
      }
      to {
        transform: translateY(0);
        max-height: 999px;
      }
    }

    @keyframes accordion-up {
      from {
        transform: translateY(0);
        max-height: 999px;
      }
      to {
        transform: translateY(-4px);
        max-height: 0;
      }
    }

  `,
  template: `

    @if (!loading())  {
      <section class="main-container">
        <h1 class="mt-4 xs:mt-0 relative bottom-4 text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left text-light-accent-primary dark:text-dark-accent-primary border-b border-slate-300 dark:border-slate-700 pb-6">
          Impostazioni
        </h1>
        <div class="flex flex-col justify-between">
          <cdk-accordion class="flex flex-col w-full border border-slate-300 dark:border-slate-500">
            @for (item of items; track item; let i = $index) {
              <cdk-accordion-item #accordionItem="cdkAccordionItem" (opened)="scrollToTop(i)">
                  <button
                    class="
                      w-full p-4 bg-slate-200 dark:bg-slate-800 border-slate-300
                      dark:border-slate-500 text-start flex items-center justify-between
                      hover:bg-slate-200/75 dark:hover:bg-slate-800/75
                      transition-colors duration-300
                      "

                    [class.border-b]="i !== items.length - 1"
                    (click)="accordionItem.toggle()"
                    tabindex="0"
                    [attr.id]="'accordion-header-' + i"
                    [attr.aria-expanded]="accordionItem.expanded"
                    [attr.aria-controls]="'accordion-body-' + i">
                    <div class="flex items-center gap-2">
                      @switch (i) {
                          @case (0) {
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto">
                              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                              <path d="M64 464L144 464L144 400L304 400L304 464L576 464L576 496L304 496L304 560L144 560L144 496L64 496L64 464zM272 496L272 432L176 432L176 528L272 528L272 496zM64 304L336 304L336 240L496 240L496 304L576 304L576 336L496 336L496 400L336 400L336 336L64 336L64 304zM176 176L64 176L64 144L176 144L176 80L336 80L336 144L576 144L576 176L336 176L336 240L176 240L176 176zM208 176L208 208L304 208L304 112L208 112L208 176zM464 304L464 272L368 272L368 368L464 368L464 304z"/>
                            </svg>
                          }
                          @case (1) {
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto">
                              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                              <path d="M576 128L576 512L64 512L64 128L576 128zM64 96L32 96L32 544L608 544L608 96L64 96zM192 256C192 238.3 206.3 224 224 224C241.7 224 256 238.3 256 256C256 273.7 241.7 288 224 288C206.3 288 192 273.7 192 256zM288 256C288 220.7 259.3 192 224 192C188.7 192 160 220.7 160 256C160 291.3 188.7 320 224 320C259.3 320 288 291.3 288 256zM167.1 384L281 384L302.3 448L336 448L304 352L144 352L112 448L145.7 448L167 384zM384 224L368 224L368 256L528 256L528 224L384 224zM384 320L368 320L368 352L528 352L528 320L384 320z"/>
                            </svg>
                          }
                          @case (2) {
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto">
                              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                              <path d="M320 64C373 64 416 107 416 160L416 224L224 224L224 160C224 107 267 64 320 64zM192 160L192 224L128 224L128 576L512 576L512 224L448 224L448 160C448 89.3 390.7 32 320 32C249.3 32 192 89.3 192 160zM160 256L480 256L480 544L160 544L160 256zM336 352L336 336L304 336L304 464L336 464L336 352z"/>
                            </svg>
                          }
                          @case (3) {
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto">
                              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                              <path d="M231.2 280L288 224L192 64L64 128L64 144C64 382.6 257.4 576 496 576L512 576L576 448L416 352L360 408.8C300.8 386 254 339.2 231.2 280zM421.1 392.4L534.1 460.2L492.2 544C274.3 542 98 365.7 96 147.8L179.8 105.9L247.6 218.9C217.7 248.4 199.8 266.1 193.8 272L201.3 291.6C227.3 359.2 280.8 412.7 348.4 438.7L368 446.2C373.9 440.2 391.6 422.3 421 392.4z"/>
                            </svg>
                          }
                      }
                      <span>{{ item }}</span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 640 640"
                      class="fill-current h-6 w-auto transition-transform duration-200"
                      [class.rotate-180]="accordionItem.expanded"
                      [class.rotate-0]="!accordionItem.expanded">
                      <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                      <path d="M320 96C196.3 96 96 196.3 96 320C96 443.7 196.3 544 320 544C443.7 544 544 443.7 544 320C544 196.3 443.7 96 320 96zM320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM331.3 411.3L320 422.6L308.7 411.3L196.7 299.3L185.4 288L208 265.4L219.3 276.7L320 377.4L420.7 276.7L432 265.4L454.6 288L443.3 299.3L331.3 411.3z"/>
                    </svg>
                  </button>
                @if (accordionItem.expanded) {
                  <div
                    class="accordion-body px-4 bg-slate-100 dark:bg-slate-700"
                    animate.enter="accordion-enter"
                    animate.leave="accordion-leave"
                    role="region"
                    [attr.id]="'accordion-body-' + i"
                    [attr.aria-labelledby]="'accordion-header-' + i"
                    [class.relative]="i === 1"
                  >
                    <div class="py-6">
                      @switch (i) {
                          @case (0) {

                            <div class="space-y-6">

                              <!-- Titolo -->
                              <div>
                                <h3 class="font-bold text-lg mb-1">
                                  Riepilogo account
                                </h3>
                                <p class="text-sm text-slate-600 dark:text-slate-300">
                                  Qui trovi una panoramica veloce del tuo profilo e dello stato dell'account.
                                </p>
                              </div>

                              <!-- RIGA 1: Profilo + Sicurezza -->
                              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

                                <!-- Card profilo -->
                                <div
                                  class="rounded-md border border-slate-300 dark:border-slate-600
                                         bg-slate-50 dark:bg-slate-800/70 px-4 py-3 flex flex-col gap-2"
                                >
                                  <div class="flex items-center justify-between gap-3 mb-1">
                                    <div>
                                      <div class="text-xs uppercase text-slate-500 dark:text-slate-400">
                                        Profilo
                                      </div>
                                      <div class="text-base font-semibold text-slate-800 dark:text-slate-100">
                                        {{ profile.firstName }} {{ profile.lastName }}
                                      </div>
                                    </div>

                                    <!-- iniziali "fittizie" da avatarId o fallback -->
                                    <div
                                      class="h-10 w-10 rounded-full flex items-center justify-center
                                             bg-slate-200 dark:bg-slate-700 text-sm font-bold
                                             text-slate-700 dark:text-slate-100"
                                    >
                                      {{ profile.firstName[0] }}{{ profile.lastName[0] }}
                                    </div>
                                  </div>

                                  <div class="text-sm space-y-1">
                                    <div class="flex justify-between gap-2">
                                      <span class="text-slate-500 dark:text-slate-400">Ruolo</span>
                                      <span class="font-medium text-slate-800 dark:text-slate-100">
                                        {{ profile.job ?? 'Non specificato' }}
                                      </span>
                                    </div>
                                    <div class="flex justify-between gap-2">
                                      <span class="text-slate-500 dark:text-slate-400">Genere</span>
                                      <span class="font-medium text-slate-800 dark:text-slate-100">
                                        {{ profile.gender }}
                                      </span>
                                    </div>
                                    <div class="flex justify-between gap-2">
                                      <span class="text-slate-500 dark:text-slate-400">E-mail</span>
                                      <span class="font-mono text-xs text-slate-700 dark:text-slate-200">
                                        {{ profile.obscuredEmail }}
                                      </span>
                                    </div>
                                    <div class="flex justify-between gap-2">
                                      <span class="text-slate-500 dark:text-slate-400">Telefono</span>
                                      <span class="font-mono text-xs text-slate-700 dark:text-slate-200">
                                        {{ profile.obscuredPhone ?? '—' }}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <!-- Card sicurezza -->
                                <div
                                  class="rounded-md border border-slate-300 dark:border-slate-600
                                         bg-slate-50 dark:bg-slate-800/70 px-4 py-3 flex flex-col gap-3"
                                >
                                  <div class="flex items-center justify-between mb-1">
                                    <div>
                                      <div class="text-xs uppercase text-slate-500 dark:text-slate-400">
                                        Sicurezza
                                      </div>
                                      <div class="text-base font-semibold text-slate-800 dark:text-slate-100">
                                        Stato dell'account
                                      </div>
                                    </div>
                                  </div>

                                  <div class="space-y-2 text-sm">
                                    <div class="flex items-center justify-between gap-2">
                                      <span class="text-slate-500 dark:text-slate-400">
                                        Autenticazione a più fattori
                                      </span>
                                      <span
                                        class="px-2 py-[2px] rounded text-xs font-semibold"
                                        [class.bg-emerald-200]="isEnabledMfa"
                                        [class.text-emerald-800]="isEnabledMfa"
                                        [class.bg-amber-200]="!isEnabledMfa"
                                        [class.text-amber-800]="!isEnabledMfa"
                                      >
                                        {{ isEnabledMfa ? 'Attiva' : 'Non attiva' }}
                                      </span>
                                    </div>

                                    <div class="flex items-center justify-between gap-2">
                                      <span class="text-slate-500 dark:text-slate-400">
                                        Sessioni attive
                                      </span>
                                      <span class="font-medium text-slate-800 dark:text-slate-100">
                                        {{ activeSessions.length || 0 }}
                                      </span>
                                    </div>
                                    @if (activeSessions.length) {
                                      <div class="flex items-center justify-between gap-2">
                                        <span class="text-slate-500 dark:text-slate-400">
                                          Sessione corrente
                                        </span>
                                        <span class="text-xs text-right text-slate-700 dark:text-slate-200">
                                          {{
                                            getCurrentSessionBrowser()
                                          }}
                                          ·
                                          {{
                                            getCurrentSessionLocation()
                                          }}
                                        </span>
                                      </div>
                                    }
                                  </div>

                                  <div class="flex justify-end pt-2">
                                    <button
                                      type="button"
                                      class="
                                        text-xs underline text-slate-600 dark:text-slate-300
                                        hover:text-slate-800 dark:hover:text-slate-100
                                        transition-colors duration-150
                                      "
                                      (click)="switchToAccordionItem(3, i)"
                                    >
                                      Vai alle impostazioni di sicurezza
                                    </button>
                                  </div>
                                </div>

                              </div>

                              <!-- RIGA 2: Statistiche Mercurion -->
                              <div>
                                <h4 class="font-bold text-base mb-3">
                                  Attività su Mercurion
                                </h4>
                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">

                                  <div
                                    class="rounded-md border border-slate-300 dark:border-slate-600
                                           bg-slate-50 dark:bg-slate-800/70 px-4 py-3"
                                  >
                                    <div class="text-xs uppercase text-slate-500 dark:text-slate-400 mb-1">
                                      Molecole personali
                                    </div>
                                    <div class="text-2xl font-semibold text-slate-800 dark:text-slate-100">
                                      {{ profile.personalMoleculeCount }}
                                    </div>
                                  </div>

                                  <div
                                    class="rounded-md border border-slate-300 dark:border-slate-600
                                           bg-slate-50 dark:bg-slate-800/70 px-4 py-3"
                                  >
                                    <div class="text-xs uppercase text-slate-500 dark:text-slate-400 mb-1">
                                      Molecole da ChEMBL
                                    </div>
                                    <div class="text-2xl font-semibold text-slate-800 dark:text-slate-100">
                                      {{ profile.chemblMoleculeCount }}
                                    </div>
                                  </div>

                                  <div
                                    class="rounded-md border border-slate-300 dark:border-slate-600
                                           bg-slate-50 dark:bg-slate-800/70 px-4 py-3"
                                  >
                                    <div class="text-xs uppercase text-slate-500 dark:text-slate-400 mb-1">
                                      Collezioni
                                    </div>
                                    <div class="text-2xl font-semibold text-slate-800 dark:text-slate-100">
                                      {{ profile.collectionCount }}
                                    </div>
                                  </div>

                                </div>
                              </div>
                              <div>
                                <h4 class="font-bold text-base mb-3">
                                  Informazioni sulla versione
                                </h4>
                                <p>Mercurion {{currentVersion}}</p>
                              </div>

                            </div>


                          }
                          @case (1) {
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                              <div class="p-2 sm:p-4">Nome</div>
                              <div class="p-2 sm:p-4"><strong>{{profile.firstName}}</strong></div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                              <div class="p-2 sm:p-4">Cognome</div>
                              <div class="p-2 sm:p-4"><strong>{{profile.lastName}}</strong></div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                              <div class="p-2 sm:p-4">Genere</div>
                              <div class="p-2 sm:p-4"><strong>{{profile.gender}}</strong></div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                              <div class="p-2 sm:p-4">Lavoro</div>
                              <div class="p-2 sm:p-4"><strong>{{profile.job ?? '―'}}</strong></div>
                            </div>
                            <button class="absolute right-6 top-6 cursor-pointer transition-[transform,color] duration-300 hover:scale-[1.075]"
                              title="Modifica anagrafica" (click)="editAnagraphics()">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="h-[22px] w-auto fill-current text-slate-800 hover:text-slate-800/75 dark:text-slate-200 dark:hover:text-slate-200/75">
                                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                                <path d="M58.1 555.9L48 592C50.7 591.2 117.4 572.6 248 536L569.4 214.6L592 192C589.6 189.6 549.1 149.1 470.6 70.6L448 48L425.4 70.6L104 392L58.1 555.9zM252.7 486L154 387.3L347.4 193.9L446.1 292.6L252.7 486zM229.4 508L94.2 545.8L132 410.6L229.4 508zM546.7 192L468.6 270.1L369.9 171.4L448 93.3L546.7 192z"/>
                              </svg>
                            </button>
                          }
                          @case (2) {
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 relative">
                              <div class="p-2 sm:p-4 sm:col-span-1">E-mail</div>
                              <div class="p-2 sm:p-4 sm:col-span-2 flex justify-between items-center">
                                <strong>{{profile.obscuredEmail}}</strong>
                                  <button class="cursor-pointer transition-[transform,color] duration-300 hover:scale-[1.075]"
                                    title="Modifica e-mail" (click)="changeEmail()">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="h-[22px] w-auto fill-current text-slate-800 hover:text-slate-800/75 dark:text-slate-200 dark:hover:text-slate-200/75">
                                    <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                                    <path d="M58.1 555.9L48 592C50.7 591.2 117.4 572.6 248 536L569.4 214.6L592 192C589.6 189.6 549.1 149.1 470.6 70.6L448 48L425.4 70.6L104 392L58.1 555.9zM252.7 486L154 387.3L347.4 193.9L446.1 292.6L252.7 486zM229.4 508L94.2 545.8L132 410.6L229.4 508zM546.7 192L468.6 270.1L369.9 171.4L448 93.3L546.7 192z"/>
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                              <div class="p-2 sm:p-4 sm:col-span-1">Numero di telefono</div>
                              <div class="p-2 sm:p-4 sm:col-span-2 flex justify-between items-center">
                                <strong>{{profile.obscuredPhone ?? '―'}}</strong>
                                  @if (profile.obscuredPhone) {
                                    <button class="cursor-pointer transition-[transform,color] duration-300 hover:scale-[1.075]"
                                      title="Modifica numero di telefono" (click)="changePhone()">
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="h-[22px] w-auto fill-current text-slate-800 hover:text-slate-800/75 dark:text-slate-200 dark:hover:text-slate-200/75 transition-colors duration-300">
                                        <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                                        <path d="M58.1 555.9L48 592C50.7 591.2 117.4 572.6 248 536L569.4 214.6L592 192C589.6 189.6 549.1 149.1 470.6 70.6L448 48L425.4 70.6L104 392L58.1 555.9zM252.7 486L154 387.3L347.4 193.9L446.1 292.6L252.7 486zM229.4 508L94.2 545.8L132 410.6L229.4 508zM546.7 192L468.6 270.1L369.9 171.4L448 93.3L546.7 192z"/>
                                      </svg>
                                    </button>
                                  } @else {
                                    <button class="cursor-pointer transition-[transform,color] duration-300 hover:scale-[1.075] border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                                      title="Aggiungi un numero di telefono" (click)="addPhone()">
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="h-[22px] w-auto fill-current text-slate-800 hover:text-slate-800/75 dark:text-slate-200 dark:hover:text-slate-200/75 transition-colors duration-300">
                                        <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                                        <path d="M336 112L336 96L304 96L304 304L96 304L96 336L304 336L304 544L336 544L336 336L544 336L544 304L336 304L336 112z"/>
                                      </svg>
                                    </button>
                                  }
                              </div>
                            </div>
                          }
                          @case (3) {
                            <h3 class="font-bold text-lg my-3">Sessioni attive</h3>
                            <div class="flex flex-col gap-y-4 mb-3">
                              @for (s of activeSessions; track s.id) {
                                <app-session-card [session]="s" (onLoggingOutFromSession)="doLogoutFromSession($event)" />
                              }
                            </div>
                            <button
                              type="button"
                              class="
                                flex items-center gap-2 px-3 py-2 rounded-md
                                bg-light-error
                                text-slate-100 font-medium text-sm
                                hover:bg-light-error/80
                                transition-colors duration-150
                              "
                              (click)="doLogoutFromAllSessions()"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg"
                                   viewBox="0 0 640 640"
                                   class="fill-current h-6 w-6">
                                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                                <path d="M240.1 128L256.1 128L256.1 96L64.1 96L64.1 544L256.1 544L256.1 512L96.1 512L96.1 128L240.1 128zM571.4 331.3L582.7 320L571.4 308.7L427.4 164.7L416.1 153.4L393.5 176L404.8 187.3L521.5 304L224.1 304L224.1 336L521.5 336L404.8 452.7L393.5 464L416.1 486.6L427.4 475.3L571.4 331.3z" />
                              </svg>
                              <span>Esci da tutte le sessioni</span>
                            </button>
                            <hr class="border-[0.5px] border-slate-400 dark:border-slate-500 mt-6" />
                            <h3 class="font-bold text-lg mt-6 mb-3">Autenticazione a più fattori</h3>
                            <div class="flex gap-8 items-center">
                              <p class="pl-3">{{isEnabledMfa ? 'Attiva' : 'Non attiva'}}</p>
                              @if (!isEnabledMfa) {
                                <button
                                  type="button"
                                  class="
                                    flex items-center gap-2 px-3 py-2 rounded-md
                                    bg-emerald-800
                                    text-slate-100 font-medium text-sm
                                    hover:bg-emerald-800/80
                                    transition-colors duration-150
                                  "
                                  (click)="doEnableMfa()"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg"
                                       viewBox="0 0 640 640"
                                       class="fill-current h-6 w-6 relative -left-1">
                                    <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                                    <path d="M432.2 432L398.5 432L377.2 368L263.3 368L242 432L208.3 432L240.3 336L400.3 336L432.3 432zM320.2 304C284.9 304 256.2 275.3 256.2 240C256.2 204.7 284.9 176 320.2 176C355.5 176 384.2 204.7 384.2 240C384.2 275.3 355.5 304 320.2 304zM320.2 208C302.5 208 288.2 222.3 288.2 240C288.2 257.7 302.5 272 320.2 272C337.9 272 352.2 257.7 352.2 240C352.2 222.3 337.9 208 320.2 208zM320.2 576L307.5 570.5C156.3 505.1 71.4 337.8 80.7 177L81.9 156.5L320.2 64L558.5 156.5L559.6 177C569 337.8 484 505.1 332.9 570.5L320.2 576zM112.7 178.9C105.9 326.2 180.4 480.6 320.2 541.1C460 480.6 534.5 326.2 527.7 178.9L320.2 98.3L112.7 178.9z"/>
                                  </svg>
                                  <span>Attiva l'autenticazione a più fattori</span>
                                </button>
                              }
                            </div>
                            @if (isEnabledMfa) {
                              <h4 class="font-bold text-base my-3 flex justify-between items-center">
                                <span>Strategie attive</span>
                                <button class="cursor-pointer transition-[transform,color] duration-300 hover:scale-[1.075]"
                                  title="Configura l'autenticazione a più fattori: aggiungi o rimuovi metodi"
                                  (click)="doConfigMfa()">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="h-7 w-auto fill-current text-slate-800 hover:text-slate-800/75 dark:text-slate-200 dark:hover:text-slate-200/75">
                                    <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                                    <path d="M384.1 48L404.6 147.5C412.4 151.3 420 155.7 427.2 160.6L523.7 128.6L587.7 239.5L511.7 307C512.3 315.6 512.3 324.5 511.7 333L587.7 400.5L523.7 511.4L427.2 479.4C420 484.2 412.5 488.6 404.6 492.5L384.1 592L256.1 592L235.6 492.5C227.8 488.7 220.2 484.3 213 479.4L116.5 511.4L52.5 400.5L128.5 333C127.9 324.4 127.9 315.5 128.5 307L52.5 239.4L116.5 128.5L213 160.5C220.2 155.7 227.7 151.3 235.6 147.4L256.1 47.9L384.1 47.9zM437.3 191L422.4 196L409.4 187.2C403.4 183.2 397.1 179.5 390.6 176.3L376.5 169.4L373.3 154L358.1 80L282.3 80C270.1 139.1 264 168.9 263.9 169.4L249.8 176.3C243.3 179.5 237 183.1 231 187.2L218 196C217.5 195.8 188.7 186.3 131.4 167.2L93.3 232.8C138.4 272.9 161.2 293.1 161.5 293.4L160.5 309C160 316.2 160 323.6 160.5 330.8L161.5 346.4L149.8 356.8L93.3 407L131.2 472.7L202.9 448.9L217.8 443.9L230.8 452.7C236.8 456.7 243.1 460.4 249.6 463.6L263.7 470.5C263.8 471 269.9 500.7 282.1 559.9L357.9 559.9L373.1 485.9L376.3 470.5L390.4 463.6C396.9 460.4 403.2 456.8 409.2 452.7L422.2 443.9L437.1 448.9L508.8 472.7L546.7 407L490.2 356.8L478.5 346.4L479.5 330.8C480 323.6 480 316.2 479.5 309L478.5 293.4L490.2 283L546.7 232.8L508.8 167.1L437.1 190.9zM264.1 320C264.1 350.9 289.1 376 320.1 376C351 376 376 350.9 376 320C376 289.1 351 264.1 320.1 264.1C289.1 264.1 264.1 289.1 264.1 320zM320 408C271.4 408 232 368.6 232.1 320C232.1 271.3 271.5 232 320.1 232C368.7 232 408.1 271.4 408.1 320.1C408 368.7 368.6 408 320 408z"/>
                                  </svg>
                                </button>
                              </h4>
                              <div class="flex flex-col gap-y-1">
                                @for (s of enabledMfaStrategies; track s) {
                                  <m-mfa-strategy-card [strategy]="s" />
                                }
                              </div>
                            }
                          }
                          @default { ... }
                      }
                    </div>
                  </div>
                }
              </cdk-accordion-item>
            }
          </cdk-accordion>
          <div class="h-[50vh]"></div>
        </div>
      </section>
    } @else {
      <div class="absolute inset-0">
        <div class="mx-auto max-w-5xl flex justify-center items-center h-full">
          <app-classic-spinner [size]="60" />
        </div>
      </div>
    }
  `
})
export class SettingsPageComponent implements OnInit, OnDestroy, AfterViewInit {

  private readonly accountService = inject(AccountService)
  private readonly toast = inject(ToastService)
  private readonly router = inject(Router)
  private readonly authService = inject(AuthService)
  private readonly appContext = inject(AppContextService)
  private readonly actionContext = inject(ActionOverlayContextService)
  private readonly changeDataContext = inject(SensitiveDataChangeContextService)

  @ViewChild(CdkAccordion)
  accordion!: CdkAccordion

  @ViewChildren(CdkAccordionItem)
  accordionItems!: QueryList<CdkAccordionItem>

  pipeStarter$: Observable<null> = of(null)

  profileFetchError = signal<boolean>(false)
  loading = signal<boolean>(true)
  currentVersion!: string


  profile!: ProfileDTO
  isEnabledMfa!: boolean
  enabledMfaStrategies!: MfaStrategy[]
  activeSessions!: SessionDTOExt[]

  items = ['Generali', 'Anagrafica', 'Contatti', 'Sicurezza']

  private fetchSub?: Subscription
  private sLoguotSub?: Subscription
  private allLoguotSub?: Subscription
  private viewSub?: Subscription

  ngOnInit(): void {
    this.fetchSub = this.accountService.getCurrentVersion().pipe(
      switchMap((curVers) => {
        this.currentVersion = curVers
        return this.accountService.isMfaEnabled()
      }),
      switchMap((ok) => {
        if (!ok) {
          this.isEnabledMfa = false
          return of([])
        }
        this.isEnabledMfa = true
        return this.accountService.getEnabledMfaStrategies()
      }),
      switchMap((str) => {
        this.enabledMfaStrategies = str
        return this.accountService.getActiveSessions()
      }),
      switchMap((s) => {
        this.activeSessions = s.map((s) => ({
          ...s,
          triggerDisappear: signal<boolean>(false)
        }))
        return this.accountService.getProfileRegistry(false)
      })
    ).subscribe({
      next: (profile) => {
        this.profile = profile
        this.loading.set(false)
      },
      error: () => queueMicrotask(() => {
        this.profileFetchError.set(true)
        this.toast.trigger(`Si è verificato un errore nel caricamento delle informazioni dell'account.`)
        this.router.navigateByUrl('/dashboard')
      })
    })
  }

  ngAfterViewInit(): void {
    this.viewSub = this.accordionItems.changes
      .pipe(startWith(this.accordionItems))
      .subscribe((items: QueryList<CdkAccordionItem>) => {
        const arr = items.toArray()
        if (arr.length) {
          this.switchToAccordionItem(0)
        }
      })
  }

  ngOnDestroy(): void {
    this.fetchSub?.unsubscribe()
    this.sLoguotSub?.unsubscribe()
    this.allLoguotSub?.unsubscribe()
    this.viewSub?.unsubscribe()
  }

  switchToAccordionItem(i: number, currentIdx?: number): void {
    const items = this.accordionItems?.toArray() ?? []
    if (i > items.length - 1) {
      return
    }
    if (!this.accordion.multi) {
      if (currentIdx !== undefined && currentIdx >= 0 && currentIdx < items.length) {
        if (currentIdx !== i) {
          items[currentIdx].close()
        }
      } else {
        items.forEach((it, idx) => {
          if (idx !== i && it.expanded) {
            it.close()
          }
        })
      }
    }
    const item = items[i]
    item.open()
  }

  scrollToTop(i: number): void {
    if (i < 2) {
      queueMicrotask(() => this.appContext.triggerScrollToTopGlobally())
    }
  }

  getCurrentSessionBrowser(): string {
    return this.activeSessions.find((s) => s.current)?.browser ?? '—'
  }

  getCurrentSessionLocation(): string {
    return this.activeSessions.find((s) => s.current)?.location ?? '—'
  }

  doLogoutFromSession(ssid: string): void {
    const onError = () => queueMicrotask(() => this.toast.trigger(`Si è verificato un errore. La sessione non è stata eliminata. Contatta il supporto.`, 'error', 3000))
    this.sLoguotSub = this.pipeStarter$.pipe(
      switchMap(() => {
        const s = this.activeSessions.find((s) => s.id === ssid)
        if (!s) {
          onError()
          return EMPTY
        }
        return this.authService.logoutFromSession(ssid, s.current)
      })
    ).subscribe({
      next: () => {
        const s = this.activeSessions.find((s) => s.id === ssid)
        if (!s) {
          onError()
          return
        }
        if (s.current) {
          queueMicrotask(() => this.toast.trigger('Logout dalla sessione corrente effettuato con successo.', 'success', 3000))
        }
        queueMicrotask(() => {
          s.triggerDisappear.set(true)
          setTimeout(() => {
            const i = this.activeSessions.findIndex((s) => s.id === ssid)
            if (i !== -1) {
              this.activeSessions.splice(i, 1)
            }
          }, 350)
        })
      },
      error: () => onError()
    })
  }

  doLogoutFromAllSessions(): void {
    const onError = () => queueMicrotask(() => this.toast.trigger(`Si è verificato un errore. Le sessioni non sono state eliminate. Contatta il supporto.`, 'error', 3000))
    this.allLoguotSub = this.authService.logoutFromAllSessions().subscribe({
      next: () => queueMicrotask(() => this.toast.trigger('Logout da tutte le sessioni effetttuato con successo.', 'success', 3000)),
      error: () => onError()
    })
  }

  doEnableMfa(): void {
    queueMicrotask(() => {
      this.changeDataContext.setInnerScope('EnableMfa')
      this.actionContext.open('SensitiveDataChange')
    })
  }

  doConfigMfa(): void {
    queueMicrotask(() => {
      this.changeDataContext.setInnerScope('ConfigMfa')
      this.actionContext.open('SensitiveDataChange')
    })
  }

  editAnagraphics(): void {

  }

  changeEmail(): void {
    queueMicrotask(() => {
      this.changeDataContext.setInnerScope('ChangeEmail')
      this.actionContext.open('SensitiveDataChange')
    })
  }

  changePhone(): void {
    queueMicrotask(() => {
      this.changeDataContext.setInnerScope('ChangePhone')
      this.actionContext.open('SensitiveDataChange')
    })
  }

  addPhone(): void {
    queueMicrotask(() => {
      this.changeDataContext.setInnerScope('AddPhone')
      this.actionContext.open('SensitiveDataChange')
    })
  }

}
