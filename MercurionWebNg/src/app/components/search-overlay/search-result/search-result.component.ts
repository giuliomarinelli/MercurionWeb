import { Component, Input } from '@angular/core';
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-search-result',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer transition group">
      <div class="w-12 h-12 flex-shrink-0 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
        <!-- Mini struttura: per ora placeholder, poi svg/immagine da SMILES -->
        <span class="text-xs text-gray-400">[SVG]</span>
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-base font-medium truncate">
          {{ molecule.preferredName }}
        </div>
        <div class="text-xs text-gray-500 truncate">
          {{ molecule.synonyms?.[0] }}
        </div>
        <div class="text-xs text-gray-400 mt-1 flex gap-2">
          @if (molecule.mwFreebase) {
            <span>MW: {{ molecule.mwFreebase | number:'1.0-1' }}</span>
          }
          @if (molecule.maxPhase) {}
          <span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
            Phase {{ molecule.maxPhase }}
          </span>
        </div>
      </div>
    </div>
  `
})
export class SearchResultComponent {
  @Input({ required: true }) molecule!: MoleculeSearchResult;
}
