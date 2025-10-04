import { Component, Input, signal } from '@angular/core';
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface';
import { SimilarItemComponent } from '../similar-item/similar-item.component';

@Component({
  selector: 'app-similars',
  imports: [SimilarItemComponent],
  template: `

    @if (_molecules()) {
      @for (molecule of molecules; track molecule) {
        <app-similar-item [molecule]="molecule" />
      }
    } @else {
      <p class="text-center">Caricamento...</p>
    }

  `

})
export class SimilarsComponent {

  _molecules = signal<MoleculeSearchResult[] | undefined>(undefined)

  @Input({ required: true })
  set molecules(molecules: MoleculeSearchResult[] | undefined) {
    this._molecules.set(molecules)
  }

}
