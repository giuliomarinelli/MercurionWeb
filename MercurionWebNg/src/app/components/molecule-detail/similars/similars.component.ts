import { Component, Input, signal } from '@angular/core';
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface';
import { SimilarItemComponent } from '../similar-item/similar-item.component';

@Component({
  selector: 'app-similars',
  imports: [SimilarItemComponent],
  template: `

    <div class="overflow-y-auto border-px relative max-h-[272px] min-h-[90px] transition-[max-height] duration-300 ease-in-out"
    [class.max-h-[181px]]="_onlyKnown()"
    [class.max-h-[272px]]="!_onlyKnown()">
      @if (_molecules().length) {
        @for (molecule of _molecules(); track molecule; let i = $index) {
          <app-similar-item [molecule]="molecule" [i]="i" />
            @if (i !== _molecules().length - 1) {
              <hr class="border-slate-300 dark:border-slate-600" />
              }
        }
      } @else {
        <p class="text-center">Caricamento...</p>
      }
    </div>
  `

})
export class SimilarsComponent {

  _molecules = signal<MoleculeSearchResult[]>([])
  _onlyKnown = signal<boolean>(true)

  @Input({ required: true })
  set molecules(molecules: MoleculeSearchResult[]) {
    this._molecules.set(molecules)
  }

  @Input({ required: true })
  set onlyKnown(onlyKnown: boolean) {
    this._onlyKnown.set(onlyKnown)
  }

}
