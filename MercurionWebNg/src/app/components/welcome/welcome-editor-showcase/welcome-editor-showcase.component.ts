import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WelcomeScreenshotComponent } from '../welcome-screenshot/welcome-screenshot.component';

@Component({
  selector: 'm-welcome-editor-showcase',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WelcomeScreenshotComponent],
  template: `
    <section id="editor" class="px-6 pb-12 sm:pb-16 lg:pb-20" aria-labelledby="editor-showcase-heading">
      <div class="mx-auto max-w-6xl">
        <div class="max-w-3xl">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Dalla struttura all’analisi</p>
          <h2 id="editor-showcase-heading" class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50">
            Disegna una molecola. Osserva come cambia l’analisi.
          </h2>
          <p class="mt-3 text-sm leading-relaxed text-slate-700 sm:text-base dark:text-slate-200">
            In modalità Analisi live, l’editor affianca alla struttura le predizioni Tox21
            e gli analoghi più simili. Modifica il disegno e consulta i risultati aggiornati
            nello stesso spazio di lavoro, prima di salvare una nuova molecola.
          </p>
        </div>
        <figure class="mt-6">
          <div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/95 shadow-lg shadow-slate-900/10 dark:border-slate-700/70 dark:bg-slate-900/90 dark:shadow-black/40">
            <m-welcome-screenshot lightSrc="/welcome/editor-live-light.png" darkSrc="/welcome/editor-live-dark.png"
              alt="Editor molecolare con la struttura dell’aspirina, quattro predizioni Tox21 e tre analoghi suggeriti affiancati."
              [width]="1302" [height]="795" />
          </div>
          <figcaption class="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            Schermata reale della modalità Analisi live. Su telefono puoi aprire l’immagine
            a dimensione intera per esplorare i dettagli. Le predizioni sono stime del modello,
            non misure sperimentali o indicazioni sulla sicurezza della molecola.
          </figcaption>
        </figure>
        <ul class="mt-6 grid gap-4 text-sm text-slate-700 sm:grid-cols-3 dark:text-slate-200">
          <li><strong class="block text-slate-900 dark:text-slate-50">Identità molecolare</strong>Nome e SMILES canonico accompagnano il disegno.</li>
          <li><strong class="block text-slate-900 dark:text-slate-50">Predizioni Tox21</strong>Probabilità ed esiti per i quattro endpoint disponibili.</li>
          <li><strong class="block text-slate-900 dark:text-slate-50">Analoghi suggeriti</strong>Strutture simili da aprire per proseguire l’esplorazione.</li>
        </ul>
      </div>
    </section>
  `,
})
export class WelcomeEditorShowcaseComponent {}
