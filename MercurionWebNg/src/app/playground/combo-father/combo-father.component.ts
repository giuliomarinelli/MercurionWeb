import { Component, signal } from '@angular/core';
import { ComboSelectComponent } from '../../components/common/combo-select/combo-select.component';


// Dato mock per la demo, il tipo può essere qualsiasi oggetto
type CollectionMock = { id: string; name: string };

@Component({
  selector: 'app-demo-combo-mock',
  standalone: true,
  imports: [ComboSelectComponent],
  template: `
    <div class="p-6 max-w-md mx-auto">
      <h3 class="font-semibold mb-3">Scegli una collezione</h3>

      <app-combo-select
        [items]="mockOptions"
        [displayFn]="displayFn"
        [valueFn]="valueFn"
        [selected]="selected()"
        searchPlaceholder="Scegli collezione"
        (select)="onCollectionSelected($event)"
      />

      @if (selected()) {
        <div class="mt-4 p-3 rounded bg-emerald-50 dark:bg-neutral-900/40">
          <span class="font-semibold">Hai selezionato:</span>
          <span class="text-emerald-600 font-mono">{{ selected()?.name }}</span>
        </div>
      }
    </div>
  `
})
export class ComboFatherComponent {
  mockOptions: CollectionMock[] = [
    { id: 'c1', name: 'Collezione Tossicità' },
    { id: 'c2', name: 'Serie Verde' },
    { id: 'c3', name: 'Lead Optimization' },
    { id: 'c4', name: 'Candidati 2025' },
  ];

  selected = signal<CollectionMock | null>(null);

  // Funzioni richieste dal componente generico!
  displayFn = (item: CollectionMock) => item.name;
  valueFn = (item: CollectionMock) => item.id;

  onCollectionSelected(option: CollectionMock) {
    this.selected.set(option);
  }
}
