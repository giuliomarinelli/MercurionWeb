import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'm-welcome-cloud-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      id="cloud"
      class="px-6 pb-12 sm:pb-16 lg:pb-20"
      aria-labelledby="cloud-logo-heading"
    >
      <div class="mx-auto max-w-6xl">
        <div
          class="
            relative overflow-hidden rounded-3xl
            border border-slate-200/80 bg-slate-50/85
            px-6 py-6 sm:px-8 sm:py-7
            shadow-sm shadow-slate-900/5
            dark:border-slate-700/70 dark:bg-slate-900/85 dark:shadow-black/30
            lg:flex lg:items-center lg:justify-between lg:gap-10
          "
        >
          <!-- Marca / logo cloud -->
          <div class="flex items-center gap-4">
            <div
              class="
                flex h-12 w-12 items-center justify-center
                rounded-2xl bg-slate-900 text-slate-50 shadow-md shadow-slate-900/30
                dark:bg-slate-50 dark:text-slate-900
              "
              aria-hidden="true"
            >
              <!-- Gocciolina + cloud stilizzato, inline per non toccare gli assets -->
              <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none">
                <path
                  d="M12.2 3.2C11.4 4.4 8 8.9 8 11.4A4.2 4.2 0 0 0 12.2 15.5 4.2 4.2 0 0 0 16.4 11.4C16.4 8.9 13 4.4 12.2 3.2Z"
                  class="fill-sky-400 dark:fill-sky-700/75"
                />
                <path
                  d="M6.2 14.5A3.6 3.6 0 0 0 3 18.1 3.9 3.9 0 0 0 6.9 22h9.2A4.9 4.9 0 0 0 21 17.1a4.7 4.7 0 0 0-4.4-4.5"
                  class="stroke-slate-100 dark:stroke-slate-900"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>

            <div>
              <p
                class="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200"
              >
                Mercurion gira nel cloud
              </p>
              <h2
                id="cloud-logo-heading"
                class="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50"
              >
                Pronto all’uso, direttamente dal browser.
              </h2>
            </div>
          </div>

          <!-- Copia di supporto -->
          <div
            class="
              mt-6 grid gap-3 text-sm
              text-slate-700 dark:text-slate-200
              sm:grid-cols-2 lg:mt-0 lg:max-w-xl
            "
          >
            <div class="flex items-start gap-2">
              <span
                class="
                  mt-[2px] inline-flex h-5 w-5 items-center justify-center
                  rounded-full bg-sky-200/70 text-[11px] font-semibold
                  text-light-accent-primary-hc
                  dark:bg-sky-400/30 dark:text-dark-accent-primary-btn-hc p-2
                "
                aria-hidden="true"
              >
                ✓
              </span>
              <p>
                <span class="font-semibold text-neutral-950 dark:text-slate-50">
                  Nessuna installazione.
                </span>
                <span class="ml-1">
                  Accedi da qualunque dispositivo moderno con un browser aggiornato.
                </span>
              </p>
            </div>

            <div class="flex items-start gap-2">
              <span
                class="
                  mt-[2px] inline-flex h-5 w-5 items-center justify-center
                  rounded-full bg-sky-200/70 text-[11px] font-semibold
                  text-light-accent-primary-hc
                  dark:bg-sky-400/30 dark:text-dark-accent-primary-btn-hc p-2
                "
                aria-hidden="true"
              >
                ✓
              </span>
              <p>
                <span class="font-semibold text-neutral-950 dark:text-slate-50">
                  Workspace separati.
                </span>
                <span class="ml-1">
                  Collezioni, note e dataset organizzati per progetto.
                </span>
              </p>
            </div>

            <div class="flex items-start gap-2">
              <span
                class="
                  mt-[2px] inline-flex h-5 w-5 items-center justify-center
                  rounded-full bg-sky-200/70 text-[11px] font-semibold
                  text-light-accent-primary-hc
                  dark:bg-sky-400/30 dark:text-dark-accent-primary-btn-hc p-2
                "
                aria-hidden="true"
              >
                ✓
              </span>
              <p>
                <span class="font-semibold text-neutral-950 dark:text-slate-50">
                  Login veloce.
                </span>
                <span class="ml-1">
                  Accesso con Google, GitHub, LinkedIn, Discord
                  oppure account Mercurion classico.
                </span>
              </p>
            </div>

            <div class="flex items-start gap-2">
              <span
                class="
                  mt-[2px] inline-flex h-5 w-5 items-center justify-center
                  rounded-full bg-sky-200/70 text-[11px] font-semibold
                  text-light-accent-primary-hc
                  dark:bg-sky-400/30 dark:text-dark-accent-primary-btn-hc p-2
                "
                aria-hidden="true"
              >
                ✓
              </span>
              <p>
                <span class="font-semibold text-neutral-950 dark:text-slate-50">
                  Pensato per la ricerca.
                </span>
                <span class="ml-1">
                  Interfaccia leggera che lascia spazio a strutture, grafici e modelli.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class WelcomeCloudLogoComponent { }
