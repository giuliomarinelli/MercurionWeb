import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'm-welcome-feature-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      id="features"
      class="px-6 pb-12 sm:pb-16 lg:pb-20"
      aria-labelledby="features-heading"
    >
      <div class="mx-auto max-w-6xl">
        <div class="max-w-3xl">
          <p
            class="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300"
          >
            Cosa puoi fare con Mercurion
          </p>
          <h2
            id="features-heading"
            class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50"
          >
            Dalla molecola al modello, nello stesso ambiente.
          </h2>
          <p class="mt-3 text-sm text-slate-700 sm:text-base dark:text-slate-200">
            La preview integra strumenti per l'esplorazione molecolare, l'editing strutturale,
            la gestione di collezioni organizzate e i primi modelli di predizione tossicologica
            basati su fingerprint e dataset come Tox21.
          </p>
        </div>

        <div
          class="mt-8 grid gap-5 md:grid-cols-3"
        >
          <!-- Card 1: esplorazione -->
          <article
            class="
              relative flex flex-col gap-3 rounded-2xl
              border border-slate-200/80 bg-slate-50/85 p-5
              shadow-sm shadow-slate-900/5
              dark:border-slate-700/70 dark:bg-slate-900/85 dark:shadow-black/30
            "
          >
            <div class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-200/70 dark:bg-sky-400/30 text-light-accent-primary-hc dark:text-dark-accent-primary-btn-hc">
              <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M11.2 2.8a1 1 0 0 1 1.6 0l2.3 3.5 4 1.1a1 1 0 0 1 .3 1.8l-3.3 2.6.4 4.1a1 1 0 0 1-1.4 1L12 15.8l-3.9 2.1a1 1 0 0 1-1.4-1l.4-4.1-3.3-2.6A1 1 0 0 1 4 7.4l4-1.1 3.2-3.5Z"
                />
              </svg>
            </div>
            <h3 class="text-base font-semibold text-neutral-950 dark:text-slate-50">
              Esplorazione e editing molecolare
            </h3>
            <p class="text-sm text-slate-700 dark:text-slate-200">
              Cerca molecole drug-like tra milioni di possibilità, visualizza le strutture
              e disegna molecole personalizzate. Calcola e consulta le proprietà chiave
              e scopri le molecole più simili con la funzione <strong>Analoghi suggeriti</strong>,
              che identifica la somiglianza strutturale tramite embedding vettoriali.
              Tutto in un’interfaccia pensata per restare leggibile anche con dataset ampi.
            </p>
            <ul class="mt-1 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li>• Focus sulla molecola corrente, con i dettagli davvero essenziali.</li>
              <li>• Pannelli strutturati per proprietà, annotazioni e log di lavoro.</li>
            </ul>
          </article>

          <!-- Card 2: collezioni -->
          <article
            class="
              relative flex flex-col gap-3 rounded-2xl
              border border-slate-200/80 bg-slate-50/85 p-5
              shadow-sm shadow-slate-900/5
              dark:border-slate-700/70 dark:bg-slate-900/85 dark:shadow-black/30
            "
          >
            <div class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-200/70 dark:bg-sky-400/30 text-light-accent-primary-hc dark:text-dark-accent-primary-btn-hc">
              <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M5 4a2 2 0 0 0-2 2v11.5A2.5 2.5 0 0 0 5.5 20H18a2 2 0 0 0 2-2V7.5A2.5 2.5 0 0 0 17.5 5H9.4L8.1 4.3A2 2 0 0 0 7.1 4H5Z"
                />
              </svg>
            </div>
            <h3 class="text-base font-semibold text-neutral-950 dark:text-slate-50">
              Collezioni curate
            </h3>
            <p class="text-sm text-slate-700 dark:text-slate-200">
              Raggruppa molecole in collezioni tematiche
              per serie, progetti o linee di ricerca, mantenendo metadati coerenti.
              Duplica una collezione, aggiungi nuove molecole oppure collega
              la stessa molecola a più collezioni in un solo passaggio.
            </p>
            <ul class="mt-1 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li>• Collezioni personali con descrizioni, tag e note contestuali.</li>
              <li>• Riferimenti ordinati a dataset pubblici (es. ChEMBL).</li>
            </ul>
          </article>

          <!-- Card 3: modelli AI -->
          <article
            class="
              relative flex flex-col gap-3 rounded-2xl
              border border-slate-200/80 bg-slate-50/85 p-5
              shadow-sm shadow-slate-900/5
              dark:border-slate-700/70 dark:bg-slate-900/85 dark:shadow-black/30
            "
          >
            <div class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-200/70 dark:bg-sky-400/30 text-light-accent-primary-hc dark:text-dark-accent-primary-btn-hc">
              <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M9.5 3A2.5 2.5 0 0 0 7 5.5V7H5.5A2.5 2.5 0 0 0 3 9.5v5A2.5 2.5 0 0 0 5.5 17H7v1.5A2.5 2.5 0 0 0 9.5 21h5a2.5 2.5 0 0 0 2.5-2.5V17h1.5A2.5 2.5 0 0 0 21 14.5v-5A2.5 2.5 0 0 0 18.5 7H17V5.5A2.5 2.5 0 0 0 14.5 3h-5Z"
                />
                <circle cx="12" cy="12" r="2.6" class="fill-slate-50 dark:fill-slate-900" />
              </svg>
            </div>
            <h3 class="text-base font-semibold text-neutral-950 dark:text-slate-50">
              Predizione tossicologica
            </h3>
            <p class="text-sm text-slate-700 dark:text-slate-200">
              Modelli multilabel di machine learning basati su fingerprint molecolari,
              per stimare la tossicità degli endpoint Tox21 con output leggibili,
              confrontabili e facili da riutilizzare nel tempo.
            </p>
            <ul class="mt-1 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li>• Preview interna con soglie configurate per ogni endpoint.</li>
              <li>• Pannello di dettaglio con probabilità per i target selezionati.</li>
            </ul>
            <p class="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              * Valori indicativi, pensati per uso esplorativo e non clinico.
            </p>
          </article>
        </div>
      </div>
    </section>
  `,
})
export class WelcomeFeatureGridComponent { }
