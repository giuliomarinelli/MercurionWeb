import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import {
  ButtonComponent,
  type ButtonIconPosition,
  type ButtonSize,
  type ButtonType,
  type ButtonVariant
} from '../../components/common/button/button.component'

@Component({
  selector: 'm-button-playground-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent],
  template: `
    <main class="mx-auto max-w-6xl space-y-8 px-4 py-8 text-light-on-surface-main dark:text-dark-on-surface-main sm:px-6 lg:px-8" aria-labelledby="playground-title">
      <header class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-widest text-light-on-surface-secondary dark:text-dark-on-surface-secondary">Pagina temporanea · accesso autenticato</p>
        <h1 id="playground-title" class="text-3xl font-bold tracking-tight">m-button playground</h1>
        <p class="max-w-3xl text-sm text-light-on-surface-secondary dark:text-dark-on-surface-secondary">
          Esempi locali del componente. Cambia tema, dimensione della finestra o impostazioni qui sotto per valutare subito le modifiche visive.
        </p>
      </header>

      <section class="rounded-2xl border border-slate-300/70 bg-light-surface-main p-5 dark:border-slate-700 dark:bg-dark-surface-main sm:p-6" aria-labelledby="variants-title">
        <h2 id="variants-title" class="mb-1 text-xl font-semibold">Varianti e dimensioni</h2>
        <p class="mb-5 text-sm text-light-on-surface-secondary dark:text-dark-on-surface-secondary">Le varianti in uso nelle tre dimensioni disponibili.</p>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr class="border-b border-slate-300/70 text-xs uppercase tracking-wide dark:border-slate-700">
                <th scope="col" class="py-3 pr-4">Variante</th>
                @for (size of sizes; track size) {
                  <th scope="col" class="px-4 py-3">{{ size }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (variant of variants; track variant) {
                <tr class="border-b border-slate-200/70 last:border-0 dark:border-slate-700/70">
                  <th scope="row" class="py-4 pr-4 font-mono text-sm font-medium">{{ variant }}</th>
                  @for (size of sizes; track size) {
                    <td class="px-4 py-4">
                      <m-button [variant]="variant" [size]="size">Esempio</m-button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-300/70 bg-light-surface-main p-5 dark:border-slate-700 dark:bg-dark-surface-main sm:p-6" aria-labelledby="states-title">
        <h2 id="states-title" class="mb-1 text-xl font-semibold">Stati</h2>
        <p class="mb-5 text-sm text-light-on-surface-secondary dark:text-dark-on-surface-secondary">Normale, disabilitato e caricamento per ogni variante, tutti in dimensione md.</p>
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          @for (variant of variants; track variant) {
            <div class="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <h3 class="mb-4 font-mono text-sm font-semibold">{{ variant }}</h3>
              <div class="flex flex-wrap items-center gap-3">
                <m-button [variant]="variant">Normale</m-button>
                <m-button [variant]="variant" [disabled]="true">Disabilitato</m-button>
                <m-button [variant]="variant" [loading]="true" [ariaLabel]="'Caricamento ' + variant">Caricamento</m-button>
              </div>
            </div>
          }
        </div>
      </section>

      <section class="rounded-2xl border border-slate-300/70 bg-light-surface-main p-5 dark:border-slate-700 dark:bg-dark-surface-main sm:p-6" aria-labelledby="content-title">
        <h2 id="content-title" class="mb-5 text-xl font-semibold">Contenuto e attributi</h2>
        <div class="flex flex-wrap items-center gap-4">
          <m-button variant="secondary" iconPosition="leading">
            <svg class="w-4 h-auto shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            <span class="text-xs">Icona iniziale</span>
          </m-button>
          <m-button variant="outline" iconPosition="trailing">
            Icona finale
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </m-button>
          <m-button variant="ghost" ariaLabel="Aggiungi elemento" type="button">
            <svg class="w-4 h-auto shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </m-button>
          <m-button variant="outline" ariaCurrent="page">Pagina corrente</m-button>
          <m-button variant="primary">Etichetta volutamente lunga per controllare spaziatura e ritorno a capo</m-button>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-300/70 bg-light-surface-main p-5 dark:border-slate-700 dark:bg-dark-surface-main sm:p-6" aria-labelledby="preview-title">
        <h2 id="preview-title" class="mb-1 text-xl font-semibold">Configurazione immediata</h2>
        <p class="mb-5 text-sm text-light-on-surface-secondary dark:text-dark-on-surface-secondary">Prova le combinazioni, inclusi i tipi nativi button, submit e reset. Usa Tab per verificare il focus.</p>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label class="flex flex-col gap-1 text-base font-medium">Variante
            <select class="rounded-lg border border-slate-400 bg-light-surface-main px-3 py-2 dark:bg-dark-surface-main" [value]="variant()" (change)="setVariant($event)">
              @for (option of variants; track option) { <option [value]="option">{{ option }}</option> }
            </select>
          </label>
          <label class="flex flex-col gap-1 text-base font-medium">Dimensione
            <select class="rounded-lg border border-slate-400 bg-light-surface-main px-3 py-2 dark:bg-dark-surface-main" [value]="size()" (change)="setSize($event)">
              @for (option of sizes; track option) { <option [value]="option">{{ option }}</option> }
            </select>
          </label>
          <label class="flex flex-col gap-1 text-base font-medium">Icona
            <select class="rounded-lg border border-slate-400 bg-light-surface-main px-3 py-2 dark:bg-dark-surface-main" [value]="icon()" (change)="setIcon($event)">
              <option value="none">Nessuna</option>
              <option value="leading">Iniziale</option>
              <option value="trailing">Finale</option>
            </select>
          </label>
          <label class="flex flex-col gap-1 text-base font-medium">Tipo nativo
            <select class="rounded-lg border border-slate-400 bg-light-surface-main px-3 py-2 dark:bg-dark-surface-main" [value]="type()" (change)="setType($event)">
              @for (option of types; track option) { <option [value]="option">{{ option }}</option> }
            </select>
          </label>
          <label class="flex flex-col gap-1 text-base font-medium sm:col-span-2">Etichetta
            <input class="rounded-lg border border-slate-400 bg-light-surface-main px-3 py-2 dark:bg-dark-surface-main" [value]="label()" (input)="setLabel($event)" />
          </label>
          <label class="flex items-center gap-2 text-base"><input type="checkbox" [checked]="disabled()" (change)="setDisabled($event)" /> Disabilitato</label>
          <label class="flex items-center gap-2 text-base"><input type="checkbox" [checked]="loading()" (change)="setLoading($event)" /> Caricamento</label>
          <label class="flex items-center gap-2 text-base"><input type="checkbox" [checked]="iconOnly()" (change)="setIconOnly($event)" /> Solo icona</label>
        </div>

        <div class="mt-6 rounded-xl border border-dashed border-slate-400/70 bg-light-surface-secondary p-6 dark:bg-dark-surface-secondary">
          <form (submit)="onSubmit($event)" (reset)="onReset()">
            <m-button
              [variant]="variant()"
              [size]="size()"
              [type]="type()"
              [disabled]="disabled()"
              [loading]="loading()"
              [iconPosition]="icon() === 'trailing' ? 'trailing' : 'leading'"
              [ariaLabel]="iconOnly() || loading() ? label() : null"
              (pressed)="onPressed()">
              @if (icon() === 'leading' || iconOnly()) {
                <svg class="w-4 h-auto shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              }
              @if (!iconOnly()) { <span [class.text-xs]="icon() === 'leading'">{{ label() }}</span> }
              @if (icon() === 'trailing' && !iconOnly()) {
                <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
              }
            </m-button>
          </form>
          <p class="mt-4 text-sm" role="status" aria-live="polite">{{ interactionStatus() }} · Pressioni: {{ pressCount() }}</p>
        </div>
      </section>
    </main>
  `
})
export class ButtonPlaygroundPageComponent {
  readonly variants: readonly ButtonVariant[] = ['primary', 'secondary', 'destructive', 'ghost', 'outline']
  readonly sizes: readonly ButtonSize[] = ['sm', 'md', 'lg']
  readonly types: readonly ButtonType[] = ['button', 'submit', 'reset']

  readonly variant = signal<ButtonVariant>('primary')
  readonly size = signal<ButtonSize>('md')
  readonly type = signal<ButtonType>('button')
  readonly icon = signal<ButtonIconPosition | 'none'>('none')
  readonly label = signal('Pulsante di prova')
  readonly disabled = signal(false)
  readonly loading = signal(false)
  readonly iconOnly = signal(false)
  readonly pressCount = signal(0)
  readonly interactionStatus = signal('Nessuna interazione')

  setVariant(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ButtonVariant
    if (this.variants.includes(value)) this.variant.set(value)
  }

  setSize(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ButtonSize
    if (this.sizes.includes(value)) this.size.set(value)
  }

  setType(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ButtonType
    if (this.types.includes(value)) this.type.set(value)
  }

  setIcon(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ButtonIconPosition | 'none'
    if (value === 'none' || value === 'leading' || value === 'trailing') this.icon.set(value)
  }

  setLabel(event: Event): void {
    this.label.set((event.target as HTMLInputElement).value)
  }

  setDisabled(event: Event): void {
    this.disabled.set((event.target as HTMLInputElement).checked)
  }

  setLoading(event: Event): void {
    this.loading.set((event.target as HTMLInputElement).checked)
  }

  setIconOnly(event: Event): void {
    this.iconOnly.set((event.target as HTMLInputElement).checked)
  }

  onPressed(): void {
    this.pressCount.update(count => count + 1)
    this.interactionStatus.set('Click ricevuto')
  }

  onSubmit(event: Event): void {
    event.preventDefault()
    this.interactionStatus.set('Submit intercettato localmente')
  }

  onReset(): void {
    this.interactionStatus.set('Reset intercettato localmente')
  }
}
