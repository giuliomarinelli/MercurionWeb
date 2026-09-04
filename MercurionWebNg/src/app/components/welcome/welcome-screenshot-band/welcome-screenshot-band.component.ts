import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PublicPipe } from '../../../pipes/public.pipe';

@Component({
  selector: 'm-welcome-screenshot-band',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PublicPipe],
  template: `
    <section
      class="px-6 pb-12 sm:pb-16 lg:pb-20"
      aria-labelledby="workspace-heading"
    >
      <div class="mx-auto max-w-6xl">
        <div
          class="
            relative overflow-hidden rounded-3xl border
            border-slate-200/80 bg-slate-50/95
            shadow-xl shadow-slate-900/10
            dark:border-slate-700/70 dark:bg-slate-900/90 dark:shadow-black/40
            px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12
          "
        >
          <!-- Glow morbido di sfondo -->
          <div
            class="pointer-events-none absolute inset-0 opacity-70 mix-blend-soft-light"
            aria-hidden="true"
          >
            <div
              class="absolute -left-24 top-0 h-48 w-48 rounded-full bg-sky-400/20 blur-3xl dark:bg-sky-500/25"
            ></div>
            <div
              class="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-500/20"
            ></div>
          </div>

          <div
            class="relative grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-10"
          >
            <!-- Testo -->
            <div class="lg:col-span-5">
              <p
                class="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300"
              >
                Un unico workspace
              </p>
              <h2
                id="workspace-heading"
                class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50"
              >
                Dal dataset alla decisione, in un’unica interfaccia semplice.
              </h2>
              <p
                class="mt-3 text-sm text-slate-700 sm:text-base dark:text-slate-200"
              >
                Mercurion porta ricerca molecolare, esplorazione, collezioni, editing
                e modelli di predizione nello stesso spazio di lavoro, così puoi passare
                dal selezionare una molecola al valutarne proprietà, profilo tossicologico
                e analoghi suggeriti senza cambiare strumento. La navigazione resta lineare
                e tutto rimane collegato.
              </p>

              <dl
                class="mt-5 space-y-2 text-xs text-slate-700 sm:text-sm dark:text-slate-200"
              >
                <div class="flex gap-3">
                  <dt class="mt-0.5">
                    <span
                      class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-200/70 text-[11px] font-semibold text-light-accent-primary-hc dark:bg-sky-400/30 dark:text-dark-accent-primary-btn-hc"
                    >
                      1
                    </span>
                  </dt>
                  <dd>
                    Individua rapidamente le molecole rilevanti per il progetto,
                    partendo da dataset pubblici o da strutture disegnate da te.
                  </dd>
                </div>

                <div class="flex gap-3">
                  <dt class="mt-0.5">
                    <span
                      class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-200/70 text-[11px] font-semibold text-light-accent-primary-hc dark:bg-sky-400/30 dark:text-dark-accent-primary-btn-hc"
                    >
                      2
                    </span>
                  </dt>
                  <dd>
                    Salva tutto in collezioni curate, con annotazioni e metadati
                    coerenti per serie, target o linea di ricerca.
                  </dd>
                </div>

                <div class="flex gap-3">
                  <dt class="mt-0.5">
                    <span
                      class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-200/70 text-[11px] font-semibold text-light-accent-primary-hc dark:bg-sky-400/30 dark:text-dark-accent-primary-btn-hc"
                    >
                      3
                    </span>
                  </dt>
                  <dd>
                    Invia le molecole ai modelli interni di predizione tossicologica
                    e confronta in pochi clic gli endpoint Tox21 più critici.
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Screenshot -->
            <div class="lg:col-span-7">
              <div class="relative">
                <!-- alone glow dietro lo screenshot -->
                <div
                  class="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-tr from-sky-500/20 via-sky-400/5 to-transparent blur-2xl"
                  aria-hidden="true"
                ></div>

                <div
                  class="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-50/95 shadow-lg shadow-slate-900/15 dark:border-slate-700/70 dark:bg-slate-950/90 dark:shadow-black/40"
                >
                  <img
                    [src]="'/welcome/search-light.png' | public"
                    alt="Workspace di Mercurion con molecole, collezioni e risultati di predizione"
                    class="w-full dark:hidden"
                    loading="lazy"
                  />
                  <img
                    [src]="'/welcome/search-dark.png' | public"
                    alt="Workspace di Mercurion in modalità scura"
                    class="hidden w-full dark:block"
                    loading="lazy"
                  />
                </div>

                <!-- Badge flottante -->
                <div
                  class="
                    pointer-events-none relative mx-auto mt-4 w-full max-w-[300px]
                    rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2 text-xs shadow-md shadow-slate-900/10 backdrop-blur
                    dark:border-slate-700/70 dark:bg-slate-900/95 dark:text-slate-100
                    sm:absolute sm:mx-0 sm:mt-0 sm:max-w-[230px] sm:-bottom-5 sm:left-4
                  "
                >
                  <p class="font-semibold">
                    Mercurion: ricerca molecolare
                  </p>
                  <p class="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                    Uno strumento semplice e reattivo per cercare in tempo reale tra milioni
                    di molecole. Quando trovi quella giusta, un solo clic ti porta direttamente
                    al dettaglio.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  ` })
export class WelcomeScreenshotBandComponent { }
