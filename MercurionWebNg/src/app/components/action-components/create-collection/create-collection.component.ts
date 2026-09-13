import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';
import { ToastService } from '../../../services/toast.service';
import { CreateCollectionContextService } from '../../../services/context/action-context/create-collection-context.service';
import { DomainInvalidationService } from '../../../services/domain-invalidation.service';
import { ActionCardComponent } from '../../common/action-card/action-card.component';
import { ActionFooterComponent } from '../../common/action-footer/action-footer.component';
import { ButtonComponent } from '../../common/button/button.component';
import {
  addSelection,
  normalizeCollectionName,
  removeSelection,
  validateCollectionName
} from '../collection-picker/collection-rules';


@Component({
  selector: 'm-create-collection',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ActionCardComponent, ActionFooterComponent, ButtonComponent],
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
  <div class="flex justify-center items-start md:items-center min-h-screen px-2 sm:px-4 pt-1 md:pt-6 m-overlay-screen">
      <m-action-card
        size="compact"
        labelledBy="createCollectionHeading"
        closeLabel="Chiudi pannello crea collezioni"
        [busy]="selectedChips.length !== 0"
        (closed)="close()"
      >
      <!-- HEADER -->
        <h2 action-card-title
          id="createCollectionHeading"
          class="text-lg font-semibold text-light-on-surface-main dark:text-dark-on-surface-main"
        >
          Crea una o più collezioni molecolari
        </h2>

      <!-- BODY -->
      <div action-card-body class="bg-white dark:bg-dark-surface-main">
        <div class="py-6 px-3 sm:px-4 flex flex-col gap-3 sm:gap-4">
          <label for="nameInput" class="ml-px text-sm font-semibold block text-light-on-surface-main dark:text-dark-on-surface-main">
            Nome della nuova collezione
          </label>

          <div class="grid grid-cols-12 gap-x-3 sm:gap-x-4 gap-y-3 xs:gap-y-4 sm:gap-y-0 items-start sm:items-center">
            <div class="col-span-12 sm:col-span-9 flex gap-2 items-center relative">
              <input
                id="nameInput"
                #nameInput
                [formControl]="nameControl"
                type="text"
                placeholder="Inserisci una nuova collezione..."
                aria-label="Nome nuova collezione"
                [attr.aria-required]="true"
                [attr.aria-describedby]="!canAddName() ? 'collectionNameFeedback' : (selectedChips.length ? 'collectionsPreview' : null)"
                class="flex-1 px-4 py-2 rounded-lg bg-white/90 text-black
                       placeholder:text-slate-500 shadow-sm
                       ring-1 ring-slate-300
                       focus:outline-none focus:ring-2 focus:ring-light-accent-primary-hq/80
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
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700 dark:text-slate-200 hover:text-light-accent-primary-hc dark:hover:text-indigo-300 transition"
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
              class="col-span-12 xs:col-span-10 xs:col-start-2 sm:col-span-3 w-full px-4 py-2.5 rounded-lg
                 bg-light-accent-primary text-white font-semibold shadow-md
                 hover:bg-light-accent-primary-hc
                 dark:bg-dark-accent-primary-btn dark:hover:bg-dark-accent-primary
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-accent-primary
                 focus-visible:ring-offset-2 focus-visible:ring-offset-light-surface-secondary
                 dark:focus-visible:ring-offset-dark-surface-secondary
                 disabled:bg-light-accent-primary/50 disabled:cursor-not-allowed
                 transition-colors duration-200 dark:shadow-btn-dark disabled:hover:bg-light-accent-primary-hc/50
                 justify-center"
              [disabled]="!canAddName()"
              (click)="onAddNewName(_trim(name()))"
              [title]="title()"
              [attr.aria-disabled]="!canAddName()"
              [attr.aria-label]="title() || 'Aggiungi nome collezione'"
            >
              Aggiungi
            </button>
          </div>
          @if (name() && !canAddName()) {
            <p id="collectionNameFeedback" class="text-sm text-red-700 dark:text-red-300" role="status" aria-live="polite">
              {{ title() }}
            </p>
          }
        </div>

        <div class="border-t border-light-border dark:border-dark-border">
          @if (selectedChips.length === 0) {
            <div
              id="collectionsPreview"
              class="flex items-center justify-center py-10 text-sm text-slate-700 dark:text-slate-200"
              role="status"
              aria-live="polite"
            >
              Qui vedrai l'anteprima dei nomi delle nuove collezioni.
            </div>
          } @else {
            <div class="h-32 sm:h-44 overflow-y-auto m-scroll-thin m-overscroll-touch pr-1 sm:pr-2">
              <div
                class="flex flex-wrap items-start gap-1 sm:gap-2 py-3 px-3"
                role="list"
                aria-label="Nomi delle nuove collezioni"
                id="collectionsPreview"
                aria-live="polite"
              >
                @for (c of selectedChips; track c) {
                  <span
                    role="listitem"
                    class="group inline-flex items-center gap-1 sm:gap-2 max-w-full
                           rounded-full px-1.5 sm:px-3 py-0.5 sm:py-1.5
                           bg-indigo-50 text-light-accent-primary-hc ring-1 ring-inset ring-light-accent-primary-hq/70
                           dark:bg-indigo-500/20 dark:text-indigo-100 dark:ring-indigo-400/40
                           shadow-sm"
                    title="{{ c }}"
                  >
                    <span class="truncate max-w-[10rem] sm:max-w-[16rem] text-[10px] sm:text-sm font-medium">
                      {{ c }}
                    </span>

                    <button
                      type="button"
                      (click)="removeChip(c)"
                      class="shrink-0 inline-flex size-3 sm:size-5 items-center justify-center rounded-full
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
                  class="inline-flex items-center gap-1 sm:gap-2 rounded-full px-1.5 sm:px-3 py-0.5 sm:py-1.5 text-[10px] sm:text-sm
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
      <m-action-footer action-card-footer>
        <m-button
          action-footer-secondary
          variant="neutral"
          (click)="close()"
        >
          Annulla
        </m-button>

        <m-button
          action-footer-primary
          [disabled]="selectedChips.length === 0"
          (click)="doSubmit()"
          aria-label="Crea le collezioni"
        >
          Crea
        </m-button>
      </m-action-footer>
    </m-action-card>
  </div>
  `
})
export class CreateCollectionComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly overlayContext = inject(ActionOverlayContextService);
  private readonly moleculeCollectionService = inject(MoleculeCollectionService);
  private readonly toast = inject(ToastService);
  private readonly createContext = inject(CreateCollectionContextService);
  private readonly invalidation = inject(DomainInvalidationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sessionId = this.overlayContext.session('CreateCollection')?.id ?? -1;

  private naSub?: Subscription;
  private addSub?: Subscription;

  private readonly nameInputRef = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  nameControl = new FormControl('', { nonNullable: true });
  name = signal<string>('');
  title = computed(() => validateCollectionName(this.name(), {
    pendingNames: this.selectedChips
  }).message ?? '');

  selectedChips: string[] = [];

  ngOnInit(): void {
    this.naSub = this.nameControl.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(val => this.name.set(val));
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.nameInputRef().nativeElement.focus());
  }

  ngOnDestroy(): void {
    this.naSub?.unsubscribe();
    this.addSub?.unsubscribe();
  }

  clear(): void {
    queueMicrotask(() => {
      this.nameControl.setValue('');
      this.nameInputRef().nativeElement.focus();
    });
  }

  close(): void {
    this.overlayContext.close(this.sessionId);
  }

  _trim(s: string): string {
    return normalizeCollectionName(s);
  }

  onAddNewName(name: string) {
    const result = validateCollectionName(name, { pendingNames: this.selectedChips });
    if (!result.ok) return;
    this.addChip(result.normalized);
    this.clear();
  }

  canAddName(): boolean {
    return validateCollectionName(this.name(), { pendingNames: this.selectedChips }).ok;
  }

  addChip(chip: string) {
    const result = validateCollectionName(chip, { pendingNames: this.selectedChips });
    if (!result.ok) return;
    this.selectedChips = addSelection(
      this.selectedChips.map(name => ({ id: name, name })),
      { id: result.normalized, name: result.normalized }
    ).map(item => item.name);
  }

  removeChip(name: string) {
    this.selectedChips = removeSelection(
      this.selectedChips.map(value => ({ id: value, name: value })),
      normalizeCollectionName(name)
    ).map(item => item.name);
  }

  clearChips() {
    this.selectedChips = [];
  }

  doSubmit(): void {
    if (!this.selectedChips.length) return;

    this.addSub = this.moleculeCollectionService.createManyCollections(this.selectedChips).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.invalidation.publish({ domain: 'molecule-collection', action: 'created' });
        this.overlayContext.close(this.sessionId);
      },
      error: () => {
        this.toast.trigger('Si è verificato un errore.', 'error', 3000);
        this.overlayContext.close(this.sessionId);
      }
    });
  }
}
