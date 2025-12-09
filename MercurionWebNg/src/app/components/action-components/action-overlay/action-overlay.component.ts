import { Component, inject, ChangeDetectionStrategy } from '@angular/core'
import { CustomMoleculeCollectionItemSaveComponent } from "../custom-molecule-collection-item-save/custom-molecule-collection-item-save.component";
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { AddMoleculesToCollectionComponent } from '../add-molecules-to-collection/add-molecules-to-collection.component';
import { CreateCollectionComponent } from '../create-collection/create-collection.component';
import { BindCollectionsToMoleculeComponent } from '../bind-collections-to-molecule/bind-collections-to-molecule.component';
import { SensitiveDataChangeComponent } from '../sensitive-data-change/sensitive-data-change.component';
import { EssentialProfileRegistryEditComponent } from '../profile-registry-edit/essential-profile-registry-edit.component';
import { TicketDetailComponent } from '../ticket-detail/ticket-detail.component';
import { NewTicketComponent } from '../new-ticket/new-ticket.component';

@Component({
  selector: 'm-action-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CustomMoleculeCollectionItemSaveComponent,
    AddMoleculesToCollectionComponent,
    CreateCollectionComponent,
    BindCollectionsToMoleculeComponent,
    SensitiveDataChangeComponent,
    EssentialProfileRegistryEditComponent,
    TicketDetailComponent,
    NewTicketComponent
  ],
  template: `

    @if (ctx.isMounted() && ctx.scope()) {
      <div
        class="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm transition-all duration-300"
        [class.opacity-0]="!ctx.isVisible()"
        [class.opacity-100]="ctx.isVisible()"
        role="dialog"
        aria-modal="true"
      >
        @switch (ctx.scope()) {
          @case ('MoleculeCollectionItemSave') {
            <m-custom-molecule-collection-item-save />
          }
          @case ('AddMoleculesToCollection') {
            <m-add-molecules-to-collection />
          }
          @case ('CreateCollection') {
            <m-create-collection />
          }
          @case ('BindCollectionsToMolecule') {
            <m-bind-collections-to-molecule />
          }
          @case ('SensitiveDataChange') {
            <m-sensitive-data-change />
          }
          @case ('EssentialProfileRegistryEdit') {
            <m-essential-profile-registry-edit />
          }
          @case ('TicketDetail') {
            <m-ticket-detail />
          }
          @case ('NewTicket') {
            <m-new-ticket />
          }
        }

      </div>
    }

  `
})
export class ActionOverlayComponent {

  protected readonly ctx = inject(ActionOverlayContextService)

}
