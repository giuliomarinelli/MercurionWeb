import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild
} from '@angular/core';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';
import { ToastService } from '../../../services/toast.service';
import { CreateCollectionContextService } from '../../../services/context/action-context/create-collection-context.service';


@Component({
  selector: 'm-create-collection',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  styles: [
    `
    /* Scrollbar sottile per i contenitori scrollabili */

    .m-scroll-thin {
      scrollbar-width: thin; /* Firefox */
      scrollbar-color: #64748b transparent; /* thumb, track */
    }

    :host-context(.dark) .m-scroll-thin {
      scrollbar-color: #94a3b8 transparent;
    }

    .m-scroll-thin::-webkit-scrollbar {
      width: 6px;
    }

    .m-scroll-thin::-webkit-scrollbar-track {
      background: transparent;
    }

    .m-scroll-thin::-webkit-scrollbar-thumb {
      background-color: #cbd5e1; /* slate-300-ish */
      border-radius: 9999px;
    }

    :host-context(.dark) .m-scroll-thin::-webkit-scrollbar-thumb {
      background-color: #475569; /* slate-600-ish */
    }

    .m-scroll-thin::-webkit-scrollbar-thumb:hover {
      background-color: #94a3b8;
    }

    :host-context(.dark) .m-scroll-thin::-webkit-scrollbar-thumb:hover {
      background-color: #e2e8f0;
    }
    `
  ],
  template: `
  <div class="flex justify-center items-center min-h-screen px-2 sm:px-4">
    <div
      class="action-card max-w-2xl"
      role="region"
      aria-labelledby="createCollectionHeading"
      [attr.aria-busy]="selectedChips.length === 0 ? false : null"
    >
      <!-- HEADER -->
      <div class="action-card-header">
        <h2
          id="createCollectionHeading"
          class="text-lg font-semibold text-light-on-surface-main dark:text-dark-on-surface-main"
        >
          Crea una o più collezioni molecolari
        </h2>

        <button
            type="button"
            class="action-card-close-btn"
            (click)="close()"
            aria-label="Chiudi pannello crea collezioni"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-5 h-auto">
            <path
              d="M182.9 137.4L160.3 114.7L115 160L137.6 182.6L275 320L137.6 457.4L115 480L160.3 525.3L182.9 502.6L320.3 365.3L457.6 502.6L480.3 525.3L525.5 480L502.9 457.4L365.5 320L502.9 182.6L525.5 160L480.3 114.7L457.6 137.4L320.3 274.7L182.9 137.4z"
            />
          </svg>
        </button>
      </div>

      <!-- BODY -->
      <div class="action-card-body bg-white dark:bg-dark-surface-main">
        <div class="py-6 px-4 flex flex-col gap-4">
          <label for="nameInput" class="ml-px text-sm font-semibold block text-light-on-surface-main dark:text-dark-on-surface-main">
            Nome della nuova collezione
          </label>

          <div class="grid grid-cols-12 gap-4">
            <div class="col-span-9 flex gap-2 items-center relative">
              <input
                id="nameInput"
                #nameInput
                [formControl]="nameControl"
                type="text"
                placeholder="Inserisci una nuova collezione..."
                aria-label="Nome nuova collezione"
                [attr.aria-required]="true"
                [attr.aria-describedby]="selectedChips.length ? 'collectionsPreview' : null"
                class="flex-1 px-4 py-2 rounded-lg bg-white/90 text-black
                       placeholder:text-gray-500 shadow-sm
                       ring-1 ring-slate-300
                       focus:outline-none focus:ring-2 focus:ring-indigo-500
                       transition w-full"
                [class.pr-10]="name().trim()"
                [class.pl-4]="name().trim()"
                [class.px-4]="!name().trim()"
                (keyup.enter)="onAddNewName(_trim(name()))"
              />

              @if (name().trim()) {
                <button
                  type="button"
                  (click)="clear()"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-500 transition"
                  tabindex="-1"
                  aria-label="Cancella input"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 20 20">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l8 8m0-8l-8 8" />
                  </svg>
                </button>
              }
            </div>

            <button
              type="button"
              class="col-span-3 px-4 py-2 rounded-lg
                     bg-light-accent-primary text-white font-semibold shadow-sm
                     hover:bg-light-accent-primary/90
                     dark:bg-dark-accent-primary-btn dark:hover:bg-dark-accent-primary
                     disabled:bg-light-accent-primary/50 disabled:cursor-not-allowed
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-accent-primary
                     focus-visible:ring-offset-2 focus-visible:ring-offset-light-surface-secondary
                     dark:focus-visible:ring-offset-dark-surface-secondary
                     transition-colors duration-200"
              [disabled]="!name() || alreadyAdded(_trim(name()))"
              (click)="onAddNewName(_trim(name()))"
              [title]="title()"
              [attr.aria-disabled]="!name() || alreadyAdded(_trim(name()))"
              [attr.aria-label]="alreadyAdded(_trim(name())) ? 'Collezione già presente' : 'Aggiungi nome collezione'"
            >
              Aggiungi
            </button>
          </div>
        </div>

        <div class="border-t border-light-border dark:border-dark-border">
          @if (selectedChips.length === 0) {
            <div
              id="collectionsPreview"
              class="flex items-center justify-center py-10 text-sm text-gray-500 dark:text-gray-400"
              role="status"
              aria-live="polite"
            >
              Qui vedrai l'anteprima dei nomi delle nuove collezioni.
            </div>
          } @else {
            <div class="h-44 overflow-y-auto m-scroll-thin">
              <div
                class="flex flex-wrap items-start gap-2 py-3 px-3"
                role="list"
                aria-label="Nomi delle nuove collezioni"
                id="collectionsPreview"
                aria-live="polite"
              >
                @for (c of selectedChips; track c) {
                  <span
                    role="listitem"
                    class="group inline-flex items-center gap-2 max-w-full
                           rounded-full px-3 py-1.5
                           bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-300
                           dark:bg-indigo-500/20 dark:text-indigo-100 dark:ring-indigo-400/40
                           shadow-sm"
                    title="{{ c }}"
                  >
                    <span class="truncate max-w-[16rem] text-sm font-medium">
                      {{ c }}
                    </span>

                    <button
                      type="button"
                      (click)="removeChip(c)"
                      class="shrink-0 inline-flex size-5 items-center justify-center rounded-full
                             hover:bg-indigo-100 dark:hover:bg-indigo-400/30
                             focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1
                             dark:focus:ring-offset-gray-900"
                      aria-label="Rimuovi {{ c }}"
                    >
                      <svg viewBox="0 0 20 20" fill="none" class="size-3.5">
                        <path
                          d="M6 6l8 8M14 6l-8 8"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                        />
                      </svg>
                    </button>
                  </span>
                }

                <span class="grow"></span>

                <button
                  type="button"
                  (click)="clearChips()"
                  class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm
                         ring-1 ring-inset ring-indigo-300 text-indigo-700 hover:bg-indigo-50
                         dark:ring-indigo-400/40 dark:text-indigo-100 dark:hover:bg-indigo-500/20
                         focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1
                         dark:focus:ring-offset-gray-900"
                  aria-label="Pulisci tutte le collezioni inserite"
                >
                  Pulisci tutto
                  <svg viewBox="0 0 20 20" fill="none" class="size-3.5">
                    <path
                      d="M5 10h10M10 5v10"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- FOOTER -->
      <div class="action-card-footer">
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-light-surface-secondary text-light-on-surface-main
                 dark:bg-slate-200 dark:text-light-on-surface-main
                 hover:bg-white dark:hover:bg-slate-300/80
                 border border-light-border dark:border-dark-border/80
                 shadow-sm
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-accent-primary
                 focus-visible:ring-offset-2 focus-visible:ring-offset-light-surface-secondary
                 dark:focus-visible:ring-offset-dark-surface-secondary
                 transition-colors duration-200"
          (click)="close()"
        >
          Annulla
        </button>

        <button
          type="button"
          class="px-4 py-2 rounded-lg
                 bg-light-accent-primary text-white font-semibold shadow-md
                 hover:bg-light-accent-primary/90
                 dark:bg-dark-accent-primary-btn dark:hover:bg-dark-accent-primary
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-accent-primary
                 focus-visible:ring-offset-2 focus-visible:ring-offset-light-surface-secondary
                 dark:focus-visible:ring-offset-dark-surface-secondary
                 disabled:bg-light-accent-primary/50 disabled:cursor-not-allowed
                 transition-colors duration-200 dark:shadow-btn-dark disabled:hover:bg-light-accent-primary/50
                 min-w-10"
          [disabled]="selectedChips.length === 0"
          (click)="doSubmit()"
          [attr.aria-disabled]="selectedChips.length === 0"
          aria-live="polite"
          aria-label="Crea le collezioni"
        >
          Crea
        </button>
      </div>
    </div>
  </div>
  `
})
export class CreateCollectionComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly overlayContext = inject(ActionOverlayContextService);
  private readonly moleculeCollectionService = inject(MoleculeCollectionService);
  private readonly toast = inject(ToastService);
  private readonly createContext = inject(CreateCollectionContextService);

  private naSub?: Subscription;
  private addSub?: Subscription;

  @ViewChild('nameInput')
  private nameInputRef!: ElementRef<HTMLInputElement>;

  nameControl = new FormControl('', { nonNullable: true });
  name = signal<string>('');
  title = computed(() => (this.name() ? 'Non puoi aggiungere duplicati.' : ''));

  selectedChips: string[] = [];

  ngOnInit(): void {
    this.naSub = this.nameControl.valueChanges.subscribe(val => this.name.set(val));
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.nameInputRef.nativeElement.focus());
  }

  ngOnDestroy(): void {
    this.naSub?.unsubscribe();
    this.addSub?.unsubscribe();
  }

  clear(): void {
    queueMicrotask(() => {
      this.nameControl.setValue('');
      this.nameInputRef.nativeElement.focus();
    });
  }

  close(): void {
    this.overlayContext.close();
  }

  _trim(s: string): string {
    return s.trim();
  }

  onAddNewName(name: string) {
    this.addChip(name);
    this.clear();
  }

  alreadyAdded(name: string): boolean {
    return this.selectedChips.includes(name);
  }

  addChip(chip: string) {
    if (!chip) return;
    if (this.selectedChips.some(name => name === chip)) return;
    this.selectedChips = [...this.selectedChips, chip];
  }

  removeChip(name: string) {
    this.selectedChips = this.selectedChips.filter(c => c !== name);
  }

  clearChips() {
    this.selectedChips = [];
  }

  doSubmit(): void {
    if (!this.selectedChips.length) return;

    this.addSub = this.moleculeCollectionService.createManyCollections(this.selectedChips).subscribe({
      next: () => {
        this.createContext.notifyAdded();
        this.overlayContext.close();
      },
      error: () => {
        this.toast.trigger('Si è verificato un errore.', 'error', 3000);
        this.overlayContext.close();
      }
    });
  }
}
