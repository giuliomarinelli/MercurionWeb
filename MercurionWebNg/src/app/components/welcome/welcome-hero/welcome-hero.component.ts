import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PublicPipe } from '../../../pipes/public.pipe';
import { RouterLink } from '@angular/router';


@Component({
  selector: 'm-welcome-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PublicPipe,
    RouterLink
  ],
  template: `
    <section
      id="top"
      class="px-6 pt-16 pb-12 sm:pt-20 sm:pb-16 lg:pt-24 lg:pb-20"
    >
      <div
        class="mx-auto max-w-6xl lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-12"
      >
        <!-- Testo -->
        <div class="lg:col-span-6">
          <div
            class="inline-flex items-center gap-2 rounded-full bg-slate-800/90 dark:bg-slate-200 px-3 py-1 text-xs font-medium text-slate-50 dark:text-slate-700"
          >
            <span
              class="inline-flex h-2 w-2 rounded-full bg-sky-300 dark:bg-sky-500"
            ></span>
            <p class="p-1">Preview sperimentale · Mercurion<span class="hidden min-[412px]:inline-flex">&nbsp;· Next Gen Chemistry</span></p>
          </div>

          <h1
            class="mt-6 text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-slate-50"
          >
            Chimica computazionale, senza attrito
          </h1>

          <p
            class="mt-4 text-pretty text-base text-slate-700 sm:text-lg dark:text-slate-200"
          >
            Mercurion è una piattaforma web per esplorare e disegnare strutture
            molecolari, costruire collezioni personalizzate e valutare il
            rischio tossicologico con modelli di intelligenza artificiale,
            partendo da dataset come Tox21 e ChEMBL.
          </p>

          <dl
            class="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-300"
          >
            <div class="flex gap-3 items-center">
              <dt class="mt-1">
                <span
                  class="flex h-6 w-6 items-center justify-center rounded-full bg-sky-200/65 text-light-accent-primary-hc dark:bg-sky-400/30 dark:text-dark-accent-primary-btn-hc"
                >
                  <svg
                    viewBox="0 0 20 20"
                    class="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M10.75 3.75a.75.75 0 0 0-1.5 0V10H5a.75.75 0 0 0 0 1.5h4.25V16a.75.75 0 0 0 1.5 0v-4.5H15A.75.75 0 0 0 15 10h-4.25V3.75Z"
                    />
                  </svg>
                </span>
              </dt>
              <dd>
                <span
                  class="font-semibold text-neutral-950 dark:text-slate-50"
                  >Esplorazione molecolare.</span
                >
                <span class="ml-1"
                  >Visualizza strutture, fingerprint e proprietà chiave in
                  pochi clic.</span
                >
              </dd>
            </div>

            <div class="flex gap-3 items-center">
              <dt class="mt-1">
                <span
                  class="flex h-6 w-6 items-center justify-center rounded-full bg-sky-200/65 text-light-accent-primary-hc dark:bg-sky-400/30 dark:text-dark-accent-primary-btn-hc"
                >
                  <svg
                    viewBox="0 0 20 20"
                    class="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M4 4.75A1.75 1.75 0 0 1 5.75 3h8.5A1.75 1.75 0 0 1 16 4.75v9.5A1.75 1.75 0 0 1 14.25 16h-8.5A1.75 1.75 0 0 1 4 14.25v-9.5Zm2 0a.25.25 0 0 0-.25-.25h-.5a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h.5a.25.25 0 0 0 .25-.25v-9.5Z"
                    />
                  </svg>
                </span>
              </dt>
              <dd>
                <span
                  class="font-semibold text-neutral-950 dark:text-slate-50"
                  >Collezioni curate.</span
                >
                <span class="ml-1"
                  >Organizza serie molecolari, dataset e note in workspace
                  dedicati.</span
                >
              </dd>
            </div>

            <div class="flex gap-3 items-center">
              <dt class="mt-1">
                <span
                  class="flex h-6 w-6 items-center justify-center rounded-full bg-sky-200/65 text-light-accent-primary-hc dark:bg-sky-400/30 dark:text-dark-accent-primary-btn-hc"
                >
                  <svg
                    viewBox="0 0 20 20"
                    class="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M10 2a.75.75 0 0 1 .67.415l7 14A.75.75 0 0 1 17 17.75H3a.75.75 0 0 1-.67-1.335l7-14A.75.75 0 0 1 10 2Zm0 2.31L4.46 16.25h11.08L10 4.31Zm0 3.44a.75.75 0 0 1 .75.75v2.75a.75.75 0 0 1-1.5 0V8.5A.75.75 0 0 1 10 7.75Zm0 5a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z"
                    />
                  </svg>
                </span>
              </dt>
              <dd>
                <span
                  class="font-semibold text-neutral-950 dark:text-slate-50"
                  >Predizione tossicologica.</span
                >
                <span class="ml-1"
                  >Modelli multilabel su endpoint Tox21 per valutazioni
                  rapide e ripetibili.</span
                >
              </dd>
            </div>
          </dl>

          <div
            class="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center"
          >
            <a
              routerLink="/login"
              class="inline-flex items-center justify-center rounded-lg bg-light-accent-primary dark:bg-dark-accent-primary-btn px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              Accedi alla preview di Mercurion
            </a>
            <a
              [routerLink]="[]"
              fragment="features"
              class="inline-flex items-center justify-center text-sm font-semibold text-slate-900 hover:text-sky-700 dark:text-slate-100 dark:hover:text-sky-300"
            >
              Guarda cosa puoi fare
              <span aria-hidden="true" class="ml-1">→</span>
            </a>
          </div>

          <p
            class="mt-8 text-xs text-slate-700 dark:text-slate-200"
          >
            Mercurion è in fase di sviluppo attivo: l’interfaccia e le
            funzionalità potrebbero cambiare rapidamente.
          </p>
        </div>

        <!-- Screenshot -->
        <div class="mt-12 lg:col-span-6 lg:mt-0">
          <div class="relative">
            <div
              class="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-tr from-sky-500/20 via-sky-400/5 to-transparent blur-2xl"
            ></div>
            <div
              class="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-50/90 shadow-xl shadow-slate-900/10 dark:border-slate-700/70 dark:bg-slate-900/80 dark:shadow-black/40"
            >
              <img
                [src]="'/welcome/prediction-light.png' | public"
                alt="Anteprima dell’interfaccia di Mercurion"
                class="w-full dark:hidden"
                loading="lazy"
              />
              <img
                [src]="'/welcome/prediction-dark.png' | public"
                alt="Anteprima dell’interfaccia di Mercurion"
                class="hidden w-full dark:block"
                loading="lazy"
              />
            </div>

            <div
              class="
                pointer-events-none relative mx-auto mt-4 w-full max-w-[300px]
                rounded-2xl border border-slate-200/70 bg-white/80 p-3 text-xs shadow-lg shadow-slate-900/10 backdrop-blur
                dark:border-slate-700/70 dark:bg-slate-900/90 dark:text-slate-100
                2xs:absolute 2xs:mx-0 xs:mt-0 2xs:max-w-none 2xs:w-52 2xs:-bottom-6 2xs:right-4
              "
            >
              <div class="flex items-center justify-between">
                <span class="font-semibold"
                  >Tox21 · modello multilabel</span
                >
                <span class="text-[10px] text-light-accent-secondary dark:text-dark-accent-secondary-hc">AUC ~0.89*</span>
              </div>
              <p
                class="mt-1 text-[11px] text-slate-700 dark:text-slate-200"
              >
                Preview interna basata su fingerprint molecolari. Valori
                indicativi, non clinici.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class WelcomeHeroComponent { }
