import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface';
import { SimilarItemComponent } from '../similar-item/similar-item.component';
import { SkeletonMoleculeCardComponent } from '../skeleton-molecule-card/skeleton-molecule-card.component';
import { SmoothResizeDirective } from '../../common/smooth-resize/smooth-resize.directive';

@Component({
  selector: 'm-similars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SimilarItemComponent, SkeletonMoleculeCardComponent, SmoothResizeDirective],
  host: { class: 'block min-w-0' },
  template: `
    <div mSmoothResize="height" class="overflow-hidden">
      <div class="relative overflow-y-auto min-h-22.5 grid gap-3 m-scroll-thin"
        [style.max-height.px]="onlyKnown() ? 320 : 420" role="region"
        tabindex="0" aria-label="Molecole simili" [attr.aria-busy]="loading()" style="scrollbar-gutter: stable">
        @if (loading()) {
          @for (i of [0, 1]; track i) {
            <m-skeleton-molecule-card [compact]="true" [footer]="false" />
          }
        } @else if (error()) {
          <div class="p-4 text-left">
            <p role="alert">Impossibile caricare gli analoghi suggeriti.</p>
            <button type="button" class="min-h-12 px-3 underline focus-visible:outline-2" (click)="retry.emit()">Riprova</button>
          </div>
        } @else if (molecules().length) {
          @for (molecule of molecules(); track molecule.id; let i = $index) {
            <m-similar-item [molecule]="molecule" [i]="i" />
          }
        } @else {
          <div class="min-h-22.5 flex items-center justify-center p-3">
            <p class="text-xs xs:text-sm text-center leading-snug whitespace-normal wrap-break-word max-w-lg">
              @if (onlyKnown()) {
                Nessun analogo noto trovato. Deseleziona <strong>Mostra solo composti noti</strong> per includere i lead sperimentali.
              } @else { Nessun analogo suggerito disponibile per questa molecola. }
            </p>
          </div>
        }
      </div>
    </div>
  `
})
export class SimilarsComponent {
  readonly molecules = input.required<MoleculeSearchResult[]>()
  readonly onlyKnown = input.required<boolean>()
  readonly loading = input(false)
  readonly error = input(false)
  readonly retry = output<void>()
}
