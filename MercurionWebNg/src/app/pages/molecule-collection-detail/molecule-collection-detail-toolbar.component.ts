import { ChangeDetectionStrategy, Component, DestroyRef, effect, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { ButtonComponent } from '../../components/common/button/button.component';
import { SearchFieldComponent } from '../../components/common/search-field/search-field.component';

@Component({
  selector: 'm-molecule-collection-detail-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, SearchFieldComponent],
  host: { class: 'block' },
  styleUrls: ['../molecule-list-page.css', './molecule-collection-detail.css'],
  template: `
    <section class="m-detail-toolbar" aria-label="Gestisci collezione">
      @if (editing()) {
        <form class="m-detail-editor" (submit)="save($event)" (keydown.escape)="cancel($event)">
          <label for="collection-name">Nome della collezione</label>
          <input #nameInput id="collection-name" class="m-detail-name-input" type="text" autocomplete="off"
            [value]="draft()" [disabled]="renamePending()" [attr.aria-invalid]="renameError() ? 'true' : null"
            [attr.aria-describedby]="renameError() ? 'collection-name-error' : null" (input)="changeName($event)" />
          @if (renameError()) { <p id="collection-name-error" role="alert">{{ renameError() }}</p> }
          <div class="m-detail-actions">
            <m-button type="submit" size="lg" [loading]="renamePending()" [disabled]="!draft().trim()">Salva nome</m-button>
            <m-button size="lg" variant="ghost" [disabled]="renamePending()" (pressed)="cancel()">Annulla</m-button>
          </div>
        </form>
      } @else {
        <div class="m-detail-heading">
          <h2>{{ name() }}</h2>
          <m-button #renameButton size="lg" variant="ghost" [disabled]="busy()" (pressed)="edit()"><svg viewBox="0 0 24 24" class="size-5 shrink-0" fill="none" stroke="currentColor" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6L16 3Z" stroke-width="1.5" /></svg>Rinomina</m-button>
        </div>
      }
      <div class="m-detail-actions">
        <m-button size="lg" [disabled]="busy() || renamePending()" (pressed)="add.emit()"><svg viewBox="0 0 24 24" class="size-5 shrink-0" fill="none" stroke="currentColor" aria-hidden="true"><path d="M12 4v16M4 12h16" stroke-width="1.5" /></svg>Aggiungi molecole</m-button>
        <m-button size="lg" variant="outline" ariaLabel="Duplica collezione" [disabled]="busy() || renamePending()" (pressed)="duplicate.emit()">Duplica</m-button>
        <button type="button" class="m-detail-delete" [disabled]="busy() || renamePending()" (click)="delete.emit()"><svg viewBox="0 0 24 24" class="size-5 shrink-0 text-light-error dark:text-dark-error" fill="none" stroke="currentColor" aria-hidden="true"><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" stroke-width="1.5" /></svg>Elimina collezione</button>
      </div>
      <m-search-field [value]="queryDraft()" [pending]="pending()" label="Cerca nella collezione"
        placeholder="Cerca nella collezione..." (valueChange)="changeSearch($event)" (submitted)="submitSearch($event)" />
    </section>
  `
})
export class MoleculeCollectionDetailToolbarComponent {
  readonly collectionId = input('');
  readonly name = input('');
  readonly search = input('');
  readonly pending = input(false);
  readonly busy = input(false);
  readonly renamePending = input(false);
  readonly renameError = input('');
  readonly renameRevision = input(0);
  readonly rename = output<string>();
  readonly duplicate = output<void>();
  readonly delete = output<void>();
  readonly add = output<void>();
  readonly searchChange = output<string>();
  readonly editing = signal(false);
  readonly draft = signal('');
  readonly queryDraft = signal('');
  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  private readonly renameButton = viewChild('renameButton', { read: ElementRef });
  private timer?: ReturnType<typeof setTimeout>;
  private seenRevision = 0;
  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
    effect(() => { this.queryDraft.set(this.search()); });
    effect(() => {
      const revision = this.renameRevision();
      if (revision !== this.seenRevision) {
        this.seenRevision = revision;
        this.closeEditor();
      }
    });
    effect(() => { this.collectionId(); this.editing.set(false); });
  }
  edit(): void {
    this.draft.set(this.name());
    this.editing.set(true);
    requestAnimationFrame(() => { this.nameInput()?.nativeElement.focus(); this.nameInput()?.nativeElement.select(); });
  }
  changeName(event: Event): void { this.draft.set((event.target as HTMLInputElement).value); }
  save(event: Event): void {
    event.preventDefault();
    if (this.renamePending() || !this.draft().trim()) return;
    if (this.draft().trim() === this.name()) { this.closeEditor(); return; }
    this.rename.emit(this.draft().trim());
  }
  cancel(event?: Event): void {
    event?.preventDefault(); event?.stopPropagation();
    if (!this.renamePending()) this.closeEditor();
  }
  private closeEditor(): void {
    this.editing.set(false);
    requestAnimationFrame(() => this.renameButton()?.nativeElement.querySelector('button')?.focus());
  }
  changeSearch(value: string): void {
    this.queryDraft.set(value);
    clearTimeout(this.timer);
    if (!value) { this.submitSearch(value); return; }
    this.timer = setTimeout(() => this.submitSearch(value), 250);
  }
  submitSearch(value: string): void {
    clearTimeout(this.timer);
    if (value.trim() !== this.search()) this.searchChange.emit(value.trim());
  }
}
