import { Component, Input, signal } from '@angular/core';
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface';
import { SimilarItemComponent } from '../similar-item/similar-item.component';

@Component({
  selector: 'app-similars',
  imports: [SimilarItemComponent],
  template: `

    <div class="h-[250px] overflow-y-auto">
      @if (_molecules().length) {
        @for (molecule of _molecules(); track molecule; let i = $index) {
          <app-similar-item [molecule]="molecule" />
          <hr class="border-slate-600 dark:border-slate-400" />
        }
      } @else {
        <p class="text-center">Caricamento...</p>
      }
    </div>
  `

})
export class SimilarsComponent {

  _molecules = signal<MoleculeSearchResult[]>([])

  @Input({ required: true })
  set molecules(molecules: MoleculeSearchResult[]) {
    this._molecules.set(molecules)
  }

}
