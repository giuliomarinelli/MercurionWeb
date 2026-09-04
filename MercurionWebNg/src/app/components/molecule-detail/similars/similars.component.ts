import { Component, ChangeDetectionStrategy, computed, Input, OnInit, signal } from '@angular/core';
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface';
import { SimilarItemComponent } from '../similar-item/similar-item.component';
import { SkeletonCollectionCardComponent } from '../../common/skeleton-card-loader/skeleton-card-loader.component';

@Component({
  selector: 'm-similars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SimilarItemComponent, SkeletonCollectionCardComponent],
  template: `

    <div class="relative overflow-y-auto border-px max-h-[272px] min-h-[90px] transition-[max-height] duration-300 ease-in-out m-scroll-thin"
    [class.max-h-[181px]]="_onlyKnown()"
    [class.max-h-[272px]]="!_onlyKnown()"
    role="region"
    aria-label="Molecole simili"
    [attr.aria-busy]="loading()">
      @if (_molecules().length) {
        @for (molecule of _molecules(); track molecule; let i = $index) {
          <m-similar-item [molecule]="molecule" [i]="i" />
            @if (i !== _molecules().length - 1) {
              <hr class="border-slate-300 dark:border-slate-600" />
              }
        }
      } @else if (loading()) {
          @for (i of [0, 1]; track i) {
            <m-skeleton-collection-card [height]="'45px'" />
          }
      } @else {
        <div class="absolute inset-0 flex items-center justify-center p-3">
          <p class="text-xs xs:text-sm text-center leading-snug whitespace-normal break-words max-w-[32rem]">
            Nessun analogo noto trovato... Deseleziona
            <strong class="block sm:inline font-semibold">
              Mostra solo composti noti
            </strong>
            per vedere i lead sperimentali più simili.
          </p>
        </div>

      }
    </div>
  `

})
export class SimilarsComponent implements OnInit {

  _molecules = signal<MoleculeSearchResult[]>([])
  _onlyKnown = signal<boolean>(true)
  loading = signal<boolean>(true)

  @Input({ required: true })
  set molecules(molecules: MoleculeSearchResult[]) {
    this._molecules.set(molecules)
  }

  @Input({ required: true })
  set onlyKnown(onlyKnown: boolean) {
    this._onlyKnown.set(onlyKnown)
  }

  ngOnInit(): void {
    setTimeout(() => this.loading.set(false), 2000)
  }

}
