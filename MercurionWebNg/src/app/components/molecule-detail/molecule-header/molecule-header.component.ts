import type { Observable } from 'rxjs';
import { CustomDetailSaveModel } from '../../../Models/custom-detail-save.model';
import { Component, computed, input, ChangeDetectionStrategy, output, signal, effect } from '@angular/core';
import { CustomDetailsComponent } from '../my-molecule-custom-details/custom-details.component';
import { MoleculeBadgeComponent } from '../molecule-badge/molecule-badge.component';
import { DialogShellComponent } from '../../common/dialog-shell/dialog-shell.component';
import { RouterLink } from '@angular/router';


@Component({
  selector: 'm-molecule-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CustomDetailsComponent,
    MoleculeBadgeComponent,
    RouterLink, DialogShellComponent
  ],
  styleUrls: ['./molecule-header.component.css'],
  template: `
    <header
      class="m-molecule-heading"
      aria-labelledby="molecule-name"
>

      <div class="m-molecule-identity min-w-0 space-y-2 max-w-full">
        @if (_myMol()) {
          @if (!_isCustom()) {
            <div class="flex flex-wrap items-center gap-3 sm:gap-4">
              <h2
                id="molecule-name"
                class="text-2xl sm:text-3xl min-w-0 [overflow-wrap:anywhere] w-full sm:w-auto md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider
                       text-left text-light-accent-primary-hc dark:text-dark-accent-primary">
                {{ name() }}
              </h2>

              <m-molecule-badge
                [name]="_badgeName()"
                class="relative shrink-0 " />
            </div>
          } @else {
            <m-custom-details
              [type]="'name'" actionSize="lg" [saveRequest]="saveRequest()"
              [value]="name()"
              [badgeName]="_badgeName()"
              [itemId]="_molId()"
              (onSaving)="doSave($event)" />
          }
        } @else {
          <div class="flex flex-wrap items-center justify-start gap-2 sm:gap-4">
            <h1
              id="molecule-name"
              class="text-2xl sm:text-3xl min-w-0 [overflow-wrap:anywhere] w-full sm:w-auto md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider
                     text-left text-light-accent-primary-hc dark:text-dark-accent-primary">
              {{ name() }}
            </h1>

            <m-molecule-badge
              [name]="'ChEMBL'"
              class="relative shrink-0 " />
          </div>
        }

        @if (_chemblIdSignal()) {
          <div class="mt-1 sm:mt-2 flex justify-start">
            <p
              class="text-xs sm:text-sm font-semibold tracking-wide text-left
                     text-light-accent-primary-hc dark:text-dark-accent-primary">
              ChEMBL ID:
              <span
                class="text-light-on-surface-secondary dark:text-slate-100 font-normal">
                {{ chemblId() }}
              </span>
            </p>
          </div>
        }
      </div>

      @if (_isLoggedIn()) {
        <nav class="m-molecule-actions" aria-label="Azioni molecola">
          <button type="button" class="m-molecule-action m-molecule-action-primary"
            title="Aggiungi ad una o più collezioni molecolari"
            [disabled]="deletePending()" (click)="doAddToCollection()"
            aria-label="Aggiungi molecola {{ name() }} ad una o più collezioni">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M12 4v16M4 12h16" stroke-width="1.5" /></svg>
            Aggiungi alle collezioni
          </button>
          <div class="m-molecule-secondary-actions">
            <a class="m-molecule-action" [routerLink]="pathToDuplicate().url" [queryParams]="pathToDuplicate().queryParams"
              [attr.aria-disabled]="deletePending() ? 'true' : null" [attr.tabindex]="deletePending() ? -1 : null"
              (click)="deletePending() && $event.preventDefault()" aria-label="Duplica molecola {{ name() }}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M5 16H4V3h12v2" /></svg>Duplica
            </a>
            @if (!_isSystemMolecule()) {
              <button type="button" class="m-molecule-action" title="Elimina da tutte le collezioni"
                [disabled]="deletePending()" (click)="doDelete()" aria-label="Elimina molecola {{ name() }}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="text-light-error dark:text-dark-error" aria-hidden="true"><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" stroke-width="1.5" /></svg>Elimina
              </button>
            }
          </div>
        </nav>
      }
    </header>
    <m-dialog-shell [mounted]="confirmingDelete()" [open]="confirmingDelete()"
      labelledBy="molecule-delete-title" describedBy="molecule-delete-description"
      [dismissalPolicy]="{ escape: !deletePending(), backdrop: !deletePending() }" (dismissed)="cancelDelete()">
      <section class="m-molecule-confirm" [attr.aria-busy]="deletePending()">
        <h2 id="molecule-delete-title">Elimina molecola?</h2>
        <p><strong>{{ name() }}</strong></p>
        <p id="molecule-delete-description">La molecola verrà eliminata da tutte le collezioni. Questa operazione non può essere annullata.</p>
        @if (deleteError()) { <p role="alert">{{ deleteError() }}</p> }
        <div class="m-molecule-secondary-actions">
          <button type="button" cdkFocusInitial class="m-molecule-action" [disabled]="deletePending()" (click)="cancelDelete()">Annulla</button>
          <button type="button" class="m-molecule-action m-molecule-action-danger" [disabled]="deletePending()" (click)="confirmDelete()">{{ deletePending() ? 'Eliminazione in corso...' : 'Elimina definitivamente' }}</button>
        </div>
      </section>
    </m-dialog-shell>
  `
})
export class MoleculeHeaderComponent {

  readonly saveRequest = input<((detail: CustomDetailSaveModel) => Observable<boolean>) | undefined>();
  readonly deletePending = input(false);
  readonly deleteError = input('');
  readonly confirmingDelete = signal(false);
  constructor() { effect(() => { this.molId(); this.confirmingDelete.set(false); }); }
  cancelDelete(): void { if (!this.deletePending()) this.confirmingDelete.set(false); }
  confirmDelete(): void { if (!this.deletePending() && this.confirmingDelete()) this.onDelete.emit(this.molId()); }
  readonly nameInput = input('')
  readonly chemblIdInput = input<string | undefined>(undefined)
  readonly myMol = input(false)
  readonly smiles = input.required<string>()
  readonly molId = input.required<string>()
  readonly isCustom = input(false)
  readonly isLoggedIn = input.required<boolean>()
  readonly isSystemMolecule = input(false)

  readonly name = computed(() => this.nameInput());
  protected readonly _chemblIdSignal = computed(() => this.chemblIdInput());
  protected readonly _myMol = computed(() => this.myMol());
  protected readonly _isCustom = computed(() => this.isCustom());
  protected readonly _badgeName = computed(() => this.isCustom() ? 'Personal' : 'ChEMBL');
  protected readonly _molId = computed(() => this.molId());
  protected readonly _isSystemMolecule = computed(() => this.isSystemMolecule());
  private readonly _smiles = computed(() => this.smiles());
  protected pathToDuplicate = computed(() => ({
    url: `/molecules/editor`,
    queryParams: {
      mode: 'duplicate',
      smiles: this._smiles()
    }
  }));
  readonly chemblId = this._chemblIdSignal;
  protected readonly _isLoggedIn = computed(() => this.isLoggedIn());

  readonly onSave = output<CustomDetailSaveModel>();

  readonly onDelete = output<string>();

  readonly onAddToCollection = output<void>();

  doSave(e: CustomDetailSaveModel): void {
    this.onSave.emit(e);
  }

  doAddToCollection(): void {
    // TODO: The 'emit' function requires a mandatory void argument
    this.onAddToCollection.emit();
  }

  doDelete(): void {
    this.confirmingDelete.set(true);
  }
}
