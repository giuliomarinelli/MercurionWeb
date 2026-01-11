import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'm-welcome-secondary-features',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section
      id="cta"
      class="px-6 pb-16 lg:pb-24"
      aria-labelledby="cta-heading"
    >
      <div
        class="mx-auto max-w-6xl lg:grid lg:grid-cols-12 lg:items-center lg:gap-10"
      >
        <!-- Testo + feature -->
        <div class="lg:col-span-7">
          <p
            class="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200"
          >
            Pronto per l’uso reale
          </p>
          <h2
            id="cta-heading"
            class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50"
          >
            Una preview stabile, pensata per sperimentare in sicurezza.
          </h2>
          <p
            class="mt-3 text-sm text-slate-700 sm:text-base dark:text-slate-200"
          >
            Anche se Mercurion è in fase di anteprima, l’esperienza è già quella
            di un ambiente di lavoro completo: autenticazione moderna, controlli
            sulle sessioni e strumenti progettati per rimanere chiari anche
            quando i dataset iniziano a crescere.
          </p>

          <dl
            class="mt-6 grid gap-4 sm:grid-cols-2"
          >
            <!-- Feature 1 -->
            <div class="flex gap-3">
              <dt class="mt-0.5">
                <span
                  class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-200/70 text-[13px] font-semibold text-light-accent-primary-hc dark:bg-sky-400/30 dark:text-dark-accent-primary-btn-hc"
                >
                  ●
                </span>
              </dt>
              <dd class="text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                Accedi con <strong>Google, LinkedIn, GitHub o Discord</strong>,
                oppure usa le credenziali Mercurion. Perfetto sia per test
                veloci sia per un utilizzo continuativo.
              </dd>
            </div>

            <!-- Feature 2 -->
            <div class="flex gap-3">
              <dt class="mt-0.5">
                <span
                  class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-200/70 text-[13px] font-semibold text-light-accent-primary-hc dark:bg-sky-400/30 dark:text-dark-accent-primary-btn-hc"
                >
                  ●
                </span>
              </dt>
              <dd class="text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                Autenticazione a più fattori, gestione delle sessioni e logout
                da tutti i dispositivi in un clic, così tieni sotto controllo
                chi può accedere al tuo workspace.
              </dd>
            </div>

            <!-- Feature 3 -->
            <div class="flex gap-3">
              <dt class="mt-0.5">
                <span
                  class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-200/70 text-[13px] font-semibold text-light-accent-primary-hc dark:bg-sky-400/30 dark:text-dark-accent-primary-btn-hc"
                >
                  ●
                </span>
              </dt>
              <dd class="text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                Collezioni, annotazioni e molecole preferite sempre nello stesso posto,
                con un’interfaccia che privilegia leggibilità e contesto.
              </dd>
            </div>

            <!-- Feature 4 -->
            <div class="flex gap-3">
              <dt class="mt-0.5">
                <span
                  class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-200/70 text-[13px] font-semibold text-light-accent-primary-hc dark:bg-sky-400/30 dark:text-dark-accent-primary-btn-hc"
                >
                  ●
                </span>
              </dt>
              <dd class="text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                Nuovi modelli e strumenti di analisi verranno integrati nella
                stessa interfaccia, così non devi cambiare ambiente quando
                Mercurion cresce con il tuo lavoro.
              </dd>
            </div>
          </dl>

          <p
            class="mt-6 text-[11px] text-slate-600 dark:text-slate-300"
          >
            Mercurion è una preview attiva: alcune funzionalità potrebbero
            evolvere rapidamente, ma l’obiettivo resta quello di mantenere
            stabile l’esperienza per chi lo usa tutti i giorni.
          </p>
        </div>

        <!-- CTA card -->
        <div class="mt-8 lg:mt-0 lg:col-span-5">
          <div
            class="rounded-2xl border border-slate-200/80 bg-slate-50/95 p-5 shadow-md shadow-slate-900/10 dark:border-slate-700/70 dark:bg-slate-900/90 dark:shadow-black/40 sm:p-6"
          >
            <h3
              class="text-base font-semibold text-slate-900 dark:text-slate-50"
            >
              Accedi alla preview di Mercurion
            </h3>
            <p
              class="mt-2 text-sm text-slate-700 dark:text-slate-200"
            >
              Entra subito nell’app: puoi usare un provider come Google,
              LinkedIn, GitHub o Discord, oppure effettuare l’accesso con il tuo
              account Mercurion.
            </p>

            <div class="mt-4">
              <a
                [routerLink]="['/login']"
                class="inline-flex w-full items-center justify-center rounded-lg bg-light-accent-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:bg-dark-accent-primary-btn transition-colors duration-150"
              >
                Accedi alla preview di Mercurion
              </a>
            </div>

            <p
              class="mt-3 text-[11px] text-slate-600 dark:text-slate-300"
            >
              Non hai ancora un account? Potrai registrarti direttamente dalla
              pagina di accesso, in pochi passaggi.
            </p>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class WelcomeSecondaryFeaturesComponent { }
