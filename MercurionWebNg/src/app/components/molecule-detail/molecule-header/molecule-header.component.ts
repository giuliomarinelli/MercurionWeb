import { CustomDetailSaveModel } from '../../../Models/custom-detail-save.model';
import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { CustomDetailsComponent } from '../my-molecule-custom-details/custom-details.component';
import { MoleculeBadgeComponent } from '../molecule-badge/molecule-badge.component';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';

@Component({
  selector: 'm-molecule-header',
  imports: [
    CustomDetailsComponent,
    MoleculeBadgeComponent,
    RouterLink,
    NgClass
  ],
  template: `
    <header class="flex flex-wrap gap-3 justify-between" aria-labelledby="molecule-name">
      <div class="space-y-2 ">
        @if (_myMol()) {
          @if (!_isCustom()) {
            <div class="flex gap-6 items-center sm:items-start flex-wrap">
              <h2 id="molecule-name"
                  class="text-3xl w-full sm:w-fit md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center text-light-accent-primary dark:text-dark-accent-primary">
                {{ name() }}
              </h2>
              <m-molecule-badge [name]="_badgeName()" class="block relative top-0.5" />
            </div>
            } @else {
              <m-custom-details [type]="'name'" [value]="name()" (onSaving)="doSave($event)" [badgeName]="_badgeName()" [itemId]="_molId()" />
            }
          } @else {
            <div class="flex gap-6 sm:items-start items-center">
              <h1 id="molecule-name"
                  class="text-3xl w-full sm:w-fit md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-left text-light-accent-primary dark:text-dark-accent-primary">
                {{ name() }}
              </h1>
              <m-molecule-badge [name]="'ChEMBL Molecule'" />
            </div>
          }
        @if (_chemblIdSignal()) {
          <p class="text-xs font-semibold tracking-wide text-center sm:text-left text-light-accent-primary dark:text-dark-accent-primary">
            ChEMBL ID:
            <span class="text-muted-foreground font-normal text-light-on-surface-main dark:text-slate-100">
              {{ chemblId() }}
            </span>
          </p>
        }
      </div>
      @if (_isLoggedIn()) {
        <div class="flex items-center gap-3 relative" [ngClass]="{'-top-6 mt-6': !_isCustom()}">
          <!-- Duplica -->
          <a
            type="button"
            class="relative p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700
                   transition-colors duration-150"
            title="Crea una nuova molecola da questa struttura (Duplica)"
            [routerLink]="pathToDuplicate().url"
            [queryParams]="pathToDuplicate().queryParams"
          >
            <svg
              class="size-7 text-slate-600 dark:text-slate-300"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M4 4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1h-1V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h1v1H6a2 2 0 0 1-2-2V4z"
              />
              <path
                d="M8 6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V6z"
              />
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
            >
              <svg
                class="size-7 text-light-error dark:text-dark-error"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M6 8a1 1 0 0 1 1 1v7h6V9a1 1 0 1 1 2 0v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1zM4 5a1 1 0 0 1 1-1h2V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v1H4V5z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          }
            <!-- 🧩 Aggiungi ad una collezione -->
            <button
              type="button"
              class="flex items-center gap-2 relative px-3 py-1 rounded-md border border-slate-300 dark:border-slate-600
                     text-slate-600 dark:text-slate-300 text-xs font-medium
                     hover:bg-slate-200 dark:hover:bg-slate-700
                     transition-colors duration-150"
              title="Aggiungi ad una o più collezioni molecolari"
              (click)="doAddToCollection()"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M336 112L336 96L304 96L304 304L96 304L96 336L304 336L304 544L336 544L336 336L544 336L544 304L336 304L336 112z"/>
              </svg>
              <span>Aggiungi ad una o più collezioni</span>
            </button>
        </div>
      }

    </header>

  `
})
export class MoleculeHeaderComponent {

  private readonly _nameSignal = signal<string>('');
  protected readonly _chemblIdSignal = signal<string | undefined>('');
  protected readonly _myMol = signal<boolean>(false)
  protected readonly _isCustom = signal<boolean>(false)
  protected readonly _badgeName = signal<string>('ChEMBL Personal Molecule')
  protected readonly _molId = signal<string>('')
  protected readonly _isSystemMolecule = signal<boolean>(false)
  private readonly _smiles = signal<string>('')
  protected pathToDuplicate = computed(() => ({
    url: `/molecules/editor`,
    queryParams: {
      mode: 'duplicate',
      smiles: this._smiles()
    }
  }))
  protected readonly _isLoggedIn = signal<boolean>(false)

  @Input()
  set nameInput(value: string) {
    this._nameSignal.set(value);
  }
  readonly name = this._nameSignal.asReadonly();

  @Input()
  set chemblIdInput(value: string | undefined) {
    this._chemblIdSignal.set(value);
  }
  readonly chemblId = this._chemblIdSignal.asReadonly();

  @Input()
  set myMol(myMol: boolean) {
    this._myMol.set(myMol)
  }

  @Input({ required: true })
  set smiles(smiles: string) {
    this._smiles.set(smiles)
  }

  @Input({ required: true })
  set molId(molId: string) {
    this._molId.set(molId)
  }

  @Input()
  set isCustom(isCustom: boolean) {
    this._isCustom.set(isCustom ?? false)
    this._badgeName.set(isCustom ? 'Personal Molecule' : 'ChEMBL Personal Molecule')
  }

  @Input({ required: true })
  set isLoggedIn(isLoggedIn: boolean) {
    this._isLoggedIn.set(isLoggedIn)
  }

  @Input()
  set isSystemMolecule(isSystemMolecule: boolean) {
    this._isSystemMolecule.set(isSystemMolecule)
  }

  @Output()
  onSave = new EventEmitter<CustomDetailSaveModel>()

  @Output()
  onDelete = new EventEmitter<string>()

  @Output()
  onAddToCollection = new EventEmitter<void>()

  doSave(e: CustomDetailSaveModel): void {
    this.onSave.emit(e)
  }

  doAddToCollection(): void {
    this.onAddToCollection.emit()
  }

  doDelete(): void {
    this.onDelete.emit(this._molId())
  }

}
