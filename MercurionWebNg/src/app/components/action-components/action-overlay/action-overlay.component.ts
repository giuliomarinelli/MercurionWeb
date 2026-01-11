import { Component, inject, ChangeDetectionStrategy, computed } from '@angular/core'
import { CustomMoleculeCollectionItemSaveComponent } from "../custom-molecule-collection-item-save/custom-molecule-collection-item-save.component";
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { AddMoleculesToCollectionComponent } from '../add-molecules-to-collection/add-molecules-to-collection.component';
import { CreateCollectionComponent } from '../create-collection/create-collection.component';
import { BindCollectionsToMoleculeComponent } from '../bind-collections-to-molecule/bind-collections-to-molecule.component';
import { SensitiveDataChangeComponent } from '../sensitive-data-change/sensitive-data-change.component';
import { EssentialProfileRegistryEditComponent } from '../profile-registry-edit/essential-profile-registry-edit.component';
import { TicketDetailComponent } from '../ticket-detail/ticket-detail.component';
import { NewTicketComponent } from '../new-ticket/new-ticket.component';
import { SelectCollectionThenRouteComponent } from '../select-collection-then-route/select-collection-then-route.component';

@Component({
  selector: 'm-action-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CustomMoleculeCollectionItemSaveComponent,
    AddMoleculesToCollectionComponent,
    CreateCollectionComponent,
    BindCollectionsToMoleculeComponent,
    SensitiveDataChangeComponent,
    EssentialProfileRegistryEditComponent,
    TicketDetailComponent,
    NewTicketComponent,
    SelectCollectionThenRouteComponent
  ],
  template: `

    @if (ctx.isMounted() && ctx.scope()) {
      <div
        class="fixed inset-0 z-[999] backdrop-blur-sm transition-all duration-300 bg-slate-300/75 dark:bg-slate-900/90 action-overlay-backdrop m-overscroll-touch"
        [class.opacity-0]="!ctx.isVisible()"
        [class.opacity-100]="ctx.isVisible()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="dialogLabel()"
        [attr.aria-hidden]="!ctx.isVisible()"
        [attr.aria-busy]="!ctx.isVisible()"
        [attr.aria-live]="ctx.isVisible() ? 'assertive' : 'off'"
        [attr.tabindex]="ctx.isVisible() ? 0 : -1"
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
          @case ('SelectCollectionThenRoute') {
            <m-select-collection-then-route />
          }

        }

      </div>
    }

  `
})
export class ActionOverlayComponent {

  protected readonly ctx = inject(ActionOverlayContextService)
  protected readonly dialogLabel = computed(() => {
    const scope = this.ctx.scope()
    switch (scope) {
      case 'MoleculeCollectionItemSave':
        return 'Salva elemento della collezione'
      case 'AddMoleculesToCollection':
        return 'Aggiungi molecole alla collezione'
      case 'CreateCollection':
        return 'Crea una nuova collezione'
      case 'BindCollectionsToMolecule':
        return 'Associa collezioni alla molecola'
      case 'SensitiveDataChange':
        return 'Modifica dati sensibili'
      case 'EssentialProfileRegistryEdit':
        return 'Modifica dati profilo'
      case 'TicketDetail':
        return 'Dettaglio ticket'
      case 'NewTicket':
        return 'Nuovo ticket'
      case 'SelectCollectionThenRoute':
        return 'Seleziona collezione'
      default:
        return 'Pannello azioni'
    }
  })

}
