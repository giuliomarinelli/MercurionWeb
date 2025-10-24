import { Component, inject } from '@angular/core';
import { CustomMoleculeCollectionItemSaveComponent } from "../custom-molecule-collection-item-save/custom-molecule-collection-item-save.component";
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { AddMoleculesToCollectionComponent } from '../add-molecules-to-collection/add-molecules-to-collection.component';
import { CreateCollectionComponent } from '../create-collection/create-collection.component';

@Component({
  selector: 'app-action-overlay',
  standalone: true,
  imports: [
    CustomMoleculeCollectionItemSaveComponent,
    AddMoleculesToCollectionComponent,
    CreateCollectionComponent
  ],
  template: `

    @if (ctx.isMounted() && ctx.scope()) {
      <div
        class="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm transition-all duration-300"
        [class.opacity-0]="!ctx.isVisible()"
        [class.opacity-100]="ctx.isVisible()"
      >
        @switch (ctx.scope()) {
          @case ('MoleculeCollectionItemSave') {
            <app-custom-molecule-collection-item-save />
          }
          @case ('AddMoleculesToCollection') {
            <app-add-molecules-to-collection />
          }
          @case ('CreateCollection') {
            <app-create-collection />
          }
        }

      </div>
    }

  `
})
export class ActionComponent {

  protected readonly ctx = inject(ActionOverlayContextService)

}
