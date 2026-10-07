import { AfterViewInit, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';
import { ToastService } from '../../../services/toast.service';
import { DomainInvalidationService } from '../../../services/domain-invalidation.service';
import { ActionCardComponent } from '../../common/action-card/action-card.component';
import { ActionFooterComponent } from '../../common/action-footer/action-footer.component';
import { ButtonComponent } from '../../common/button/button.component';
import { normalizeCollectionName, validateCollectionName } from '../collection-picker/collection-rules';

@Component({
  selector: 'm-create-collection',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ActionCardComponent, ActionFooterComponent, ButtonComponent],
  styleUrl: './create-collection.component.css',
  template: `
    <div class="flex justify-center items-start md:items-center px-2 sm:px-4 m-overlay-screen">
      <m-action-card size="compact" labelledBy="createCollectionHeading"
        closeLabel="Chiudi pannello crea collezioni" [busy]="pending()"
        [closeDisabled]="pending()" (closed)="close()">
        <h2 action-card-title id="createCollectionHeading" class="text-lg font-semibold">Crea collezioni</h2>
        <div action-card-body class="collection-body">
          <p class="collection-intro">Organizza le tue molecole in collezioni. Aggiungi uno o più nomi, poi conferma la creazione.</p>
          <label for="nameInput">Nome della collezione</label>
          <div class="collection-entry">
            <div class="collection-input-wrap">
              <input id="nameInput" #nameInput [formControl]="nameControl" type="text"
                autocomplete="off" placeholder="Es. Composti di riferimento"
                aria-describedby="collectionNameHelp collectionNameFeedback"
                [attr.aria-invalid]="name() && !validation().ok ? 'true' : null"
                (keydown.enter)="$event.preventDefault(); onAddNewName(name())" />
              @if (name()) {
                <button type="button" class="collection-clear" aria-label="Cancella il nome"
                  [disabled]="pending()" (click)="clear()">×</button>
              }
            </div>
            <m-button variant="outline" [fullWidth]="true" [disabled]="!canAddName()"
              (click)="onAddNewName(name())">Aggiungi nome</m-button>
          </div>
          <p id="collectionNameHelp" class="collection-help">{{ name().trim() ? 'Aggiungi o cancella questo nome prima di confermare la creazione.' : 'Premi Invio o usa “Aggiungi nome” per inserirlo nell’elenco.' }}</p>
          <p id="collectionNameFeedback" class="collection-feedback" role="status">{{ name() && !validation().ok ? validation().message : '' }}</p>
          <section class="collection-preview" aria-labelledby="collectionPreviewHeading">
            <div class="collection-preview-heading">
              <h3 id="collectionPreviewHeading">Da creare <span class="collection-count">{{ selectedChips().length }}</span></h3>
              @if (selectedChips().length) {
                <button type="button" class="collection-reset" [disabled]="pending()" (click)="clearChips()">Svuota elenco</button>
              }
            </div>
            <p class="collection-summary" role="status">{{ selectedChips().length === 0 ? 'Nessun nome aggiunto.' : selectedChips().length === 1 ? '1 collezione pronta per la creazione.' : selectedChips().length + ' collezioni pronte per la creazione.' }}</p>
            @if (!selectedChips().length) {
              <div class="collection-empty"><span aria-hidden="true">＋</span><p>Le tue nuove collezioni compariranno qui.</p><p class="collection-help">Potrai aggiungere le molecole dopo la creazione.</p></div>
            } @else {
              <ul class="collection-list m-scroll-thin" aria-label="Collezioni da creare">
                @for (c of selectedChips(); track c) {
                  <li><span class="collection-name">{{ c }}</span>
                    <button type="button" class="collection-remove" [disabled]="pending()"
                      [attr.aria-label]="'Rimuovi ' + c" (click)="removeChip(c)">×</button>
                  </li>
                }
              </ul>
            }
          </section>
          @if (submissionError()) {
            <p class="collection-error" role="alert">{{ submissionError() }}</p>
          }
          <p class="collection-pending" role="status">{{ pending() ? 'Creazione in corso…' : '' }}</p>
        </div>
        <m-action-footer action-card-footer>
          <m-button action-footer-secondary variant="outline" [disabled]="pending()" (click)="close()">Annulla</m-button>
          <m-button action-footer-primary [disabled]="!selectedChips().length || !!name().trim()" [loading]="pending()" (click)="doSubmit()">
            {{ selectedChips().length > 1 ? 'Crea ' + selectedChips().length + ' collezioni' : 'Crea collezione' }}
          </m-button>
        </m-action-footer>
      </m-action-card>
    </div>
  `
})
export class CreateCollectionComponent implements OnInit, AfterViewInit {
  private readonly overlayContext = inject(ActionOverlayContextService);
  private readonly moleculeCollectionService = inject(MoleculeCollectionService);
  private readonly toast = inject(ToastService);
  private readonly invalidation = inject(DomainInvalidationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sessionId = this.overlayContext.session('CreateCollection')?.id ?? -1;
  private readonly nameInputRef = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');
  readonly nameControl = new FormControl('', { nonNullable: true });
  readonly name = signal('');
  readonly selectedChips = signal<string[]>([]);
  readonly pending = signal(false);
  readonly submissionError = signal('');
  readonly validation = computed(() => validateCollectionName(this.name(), { pendingNames: this.selectedChips() }));

  ngOnInit(): void {
    this.nameControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.name.set(value));
  }
  ngAfterViewInit(): void {
    queueMicrotask(() => {
      if (!this.destroyRef.destroyed) this.nameInputRef().nativeElement.focus();
    });
  }
  clear(): void {
    if (this.pending()) return;
    this.nameControl.setValue('');
    this.nameInputRef().nativeElement.focus();
  }
  close(): void {
    if (!this.pending()) this.overlayContext.close(this.sessionId);
  }
  onAddNewName(name: string): void {
    if (this.pending()) return;
    const result = validateCollectionName(name, { pendingNames: this.selectedChips() });
    if (!result.ok) return;
    this.selectedChips.update(names => [...names, result.normalized]);
    this.submissionError.set('');
    this.clear();
  }
  canAddName(): boolean {
    return !this.pending() && this.validation().ok;
  }
  removeChip(name: string): void {
    if (this.pending()) return;
    this.selectedChips.update(names => names.filter(value => value !== normalizeCollectionName(name)));
    this.submissionError.set('');
    this.nameInputRef().nativeElement.focus();
  }
  clearChips(): void {
    if (this.pending()) return;
    this.selectedChips.set([]);
    this.submissionError.set('');
    this.nameInputRef().nativeElement.focus();
  }
  doSubmit(): void {
    if (this.pending() || !this.selectedChips().length || this.name().trim()) return;
    const names = [...this.selectedChips()];
    this.pending.set(true);
    this.overlayContext.beginSubmit(this.sessionId);
    this.submissionError.set('');
    this.nameControl.disable({ emitEvent: false });
    this.moleculeCollectionService.createManyCollections(names).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.pending.set(false);
        this.overlayContext.submitSucceeded(this.sessionId);
        this.invalidation.publish({ domain: 'molecule-collection', action: 'created' });
        this.overlayContext.close(this.sessionId);
        this.toast.trigger(names.length === 1 ? 'Collezione creata con successo.' : 'Collezioni create con successo.', 'success', 3000);
      },
      error: () => {
        this.pending.set(false);
        this.overlayContext.submitFailed(this.sessionId);
        this.nameControl.enable({ emitEvent: false });
        this.submissionError.set('Non è stato possibile creare le collezioni. I nomi sono conservati: riprova tra poco.');
      }
    });
  }
}
