import { RouterLink } from '@angular/router';
import { Component, Input, signal } from '@angular/core';
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface';
import { DecimalPipe } from '@angular/common';
import { SearchContextService } from '../../../services/context/search-context.service';

@Component({
  selector: 'app-search-result',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  template: `
    <a [routerLink]="_pathToMolecule()" (click)="searchContext.close()"
        class="flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer transition group">
      <div class="w-12 h-12 flex-shrink-0 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
        <!-- Mini struttura: placeholder, SVG futuro -->
        <span class="text-xs text-gray-400">[SVG]</span>
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-base font-medium truncate"
             [innerHTML]="highlight(_molecule()?.preferredName)">
        </div>
        <div class="text-xs text-gray-500 truncate"
             [innerHTML]="highlight(_molecule()?.synonyms?.[0])">
        </div>
        <div class="text-xs text-gray-400 mt-1 flex gap-2">
          @if (_molecule()?.mwFreebase) {
            <span>MW: {{ _molecule()?.mwFreebase | number:'1.0-1' }}</span>
          }
          @if (_molecule()?.maxPhase) {
            <span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
              Phase {{ _molecule()?.maxPhase }}
            </span>
          }
        </div>
      </div>
    </a>

  `
})
export class SearchResultComponent {

  _molecule = signal<MoleculeSearchResult | undefined>(undefined)
  _pathToMolecule = signal<string>('')
  _query = signal<string>('')

  constructor(protected readonly searchContext: SearchContextService) { }

  @Input({ required: true })
  set molecule(molecule: MoleculeSearchResult) {
    this._molecule.set(molecule)
    this._pathToMolecule.set(`molecules/detail/${molecule.id}`)
  }

  @Input({ required: true })
  set query(query: string) {
    this._query.set(query)
  }

  highlight(text: string | undefined): string {
    const query = this._query();
    if (!text || !query) return text || '';
    const escQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escQuery})`, 'gi');
    return text.replace(regex, '<mark class="bg-sky-300/75 dark:bg-sky-500/75 rounded px-1">$1</mark>');
  }



}
