import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonComponent } from '../../components/common/button/button.component';
import { SkeletonMoleculeCardComponent } from '../../components/molecule-detail/skeleton-molecule-card/skeleton-molecule-card.component';

@Component({
  selector: 'm-molecule-collection-detail-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, SkeletonMoleculeCardComponent],
  styleUrls: ['../molecule-list-page.css'],
  template: `
    @if (loading() && !hasItems()) {
      <div class="m-list-skeletons" aria-label="Caricamento molecole" aria-busy="true">
        @for (i of [0,1,2,3,4]; track i) { <m-skeleton-molecule-card [removeAction]="true" /> }
      </div>
    } @else if (error()) {
      <div class="m-list-error" role="alert"><p>{{ error() }}</p><m-button size="lg" variant="outline" (pressed)="retry.emit()">Riprova</m-button></div>
    } @else if (empty()) {
      <section class="m-list-empty" role="status">
        <h3>{{ search() ? 'Nessuna corrispondenza' : 'La collezione è vuota' }}</h3>
        <p>{{ search() ? 'Prova un altro nome o cancella la ricerca.' : 'Aggiungi molecole per iniziare a organizzare questa collezione.' }}</p>
        @if (search()) { <m-button size="lg" variant="outline" (pressed)="clear.emit()">Cancella ricerca</m-button> }
        @else { <m-button size="lg" (pressed)="add.emit()">+ Aggiungi molecole</m-button> }
      </section>
    } @else if (loading()) {
      <p class="m-list-end" role="status">Caricamento di altre molecole...</p>
    } @else if (!done()) {
      <div class="m-list-pagination"><m-button size="lg" variant="outline" (pressed)="loadMore.emit()">Carica altre molecole</m-button></div>
    } @else if (hasItems()) {
      <p class="m-list-end">Hai visualizzato tutte le molecole{{ search() ? ' corrispondenti alla ricerca' : ' della collezione' }}.</p>
    }
  `
})
export class MoleculeCollectionDetailPaginationComponent {
  readonly loading = input(false);
  readonly hasItems = input(false);
  readonly empty = input(false);
  readonly done = input(false);
  readonly search = input('');
  readonly error = input<string | undefined>(undefined);
  readonly loadMore = output<void>();
  readonly retry = output<void>();
  readonly clear = output<void>();
  readonly add = output<void>();
}
