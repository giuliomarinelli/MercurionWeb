import { CustomDetailSaveModel } from '../../../Models/custom-detail-save.model';
import { Component, computed, input, ChangeDetectionStrategy, output } from '@angular/core';
import { CustomDetailsComponent } from '../my-molecule-custom-details/custom-details.component';
import { MoleculeBadgeComponent } from '../molecule-badge/molecule-badge.component';
import { RouterLink } from '@angular/router';


@Component({
  selector: 'm-molecule-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CustomDetailsComponent,
    MoleculeBadgeComponent,
    RouterLink
  ],
  template: `
    <header
      class="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-4 sm:gap-6"
      aria-labelledby="molecule-name"
      role="banner">

      <div class="flex-1 space-y-2 w-full">
        @if (_myMol()) {
          @if (!_isCustom()) {
            <div class="flex flex-col items-center sm:flex-row sm:items-center gap-3 sm:gap-4">
              <h2
                id="molecule-name"
                class="text-3xl w-full sm:w-auto md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider
                       text-center sm:text-left text-light-accent-primary-hc dark:text-dark-accent-primary">
                {{ name() }}
              </h2>

              <m-molecule-badge
                [name]="_badgeName()"
                class="relative shrink-0 mx-auto sm:mx-0" />
            </div>
          } @else {
            <m-custom-details
              [type]="'name'"
              [value]="name()"
              [badgeName]="_badgeName()"
              [itemId]="_molId()"
              (onSaving)="doSave($event)" />
          }
        } @else {
          <div class="flex flex-col items-center sm:flex-row sm:items-center justify-center xs:justify-start gap-2 sm:gap-4">
            <h1
              id="molecule-name"
              class="text-3xl w-full sm:w-auto md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider
                     text-center sm:text-left text-light-accent-primary-hc dark:text-dark-accent-primary">
              {{ name() }}
            </h1>

            <m-molecule-badge
              [name]="'ChEMBL'"
              class="relative shrink-0 mx-auto sm:mx-0 justify-self-center" />
          </div>
        }

        @if (_chemblIdSignal()) {
          <div class="mt-1 sm:mt-2 flex justify-center sm:justify-start">
            <p
              class="text-xs sm:text-sm font-semibold tracking-wide text-center sm:text-left
                     text-light-accent-primary-hc dark:text-dark-accent-primary">
              ChEMBL ID:
              <span
                class="text-muted-foreground font-normal text-light-on-surface-main dark:text-slate-100">
                {{ chemblId() }}
              </span>
            </p>
          </div>
        }
      </div>

      @if (_isLoggedIn()) {
        <div
          class="mt-3 sm:mt-0 sm:ml-6 flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3
                 justify-start sm:justify-end w-full sm:w-auto">

          <!-- Duplica -->
          <a
            class="relative p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700
                   transition-colors duration-150"
            title="Crea una nuova molecola da questa struttura (Duplica)"
            [routerLink]="pathToDuplicate().url"
            [queryParams]="pathToDuplicate().queryParams"
            aria-label="Duplica molecola {{ name() }}">
            <svg
              class="size-7 text-slate-600 dark:text-slate-300"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true">
              <path
                d="M4 4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1h-1V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h1v1H6a2 2 0 0 1-2-2V4z" />
              <path
                d="M8 6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V6z" />
            </svg>
          </a>

          @if (!_isSystemMolecule()) {
            <!-- Elimina -->
            <button
              type="button"
              class="relative p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700
                     transition-colors duration-150"
              title="Elimina da tutte le collezioni"
              (click)="doDelete()"
              aria-label="Elimina molecola {{ name() }}">
              <svg
                class="size-7 text-light-error dark:text-dark-error"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true">
                <path
                  fill-rule="evenodd"
                  d="M6 8a1 1 0 0 1 1 1v7h6V9a1 1 0 1 1 2 0v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1zM4 5a1 1 0 0 1 1-1h2V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v1H4V5z"
                  clip-rule="evenodd" />
              </svg>
            </button>
          }

          <!-- Aggiungi ad una o più collezioni -->
          <button
            type="button"
            class="flex items-center gap-2 flex-wrap sm:flex-nowrap relative
                   px-3 py-1 rounded-md border border-slate-300 dark:border-slate-600
                   text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium
                   hover:bg-slate-200 dark:hover:bg-slate-700
                   transition-colors durata-150
                   w-fit sm:w-auto justify-center sm:justify-start text-left shrink-0"
            title="Aggiungi ad una o più collezioni molecolari"
            (click)="doAddToCollection()
"
            aria-label="Aggiungi molecola {{ name() }} ad una o più collezioni">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              class="fill-current h-5 w-auto"
              aria-hidden="true">
              <path d="M336 112L336 96L304 96L304 304L96 304L96 336L304 336L304 544L336 544L336 336L544 336L544 304L336 304L336 112z" />
            </svg>
            <span>Aggiungi ad una o più collezioni</span>
          </button>
        </div>
      }
    </header>
  `
})
export class MoleculeHeaderComponent {

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
    this.onDelete.emit(this._molId());
  }
}
