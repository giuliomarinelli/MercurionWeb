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
import { DialogShellComponent, DialogDismissalPolicy } from '../../common/dialog-shell/dialog-shell.component';

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
    SelectCollectionThenRouteComponent,
    DialogShellComponent
  ],
  template: `

    @if (ctx.isMounted() && ctx.scope()) {
      <m-dialog-shell
        [mounted]="ctx.isMounted()"
        [open]="ctx.isVisible()"
        [label]="dialogLabel()"
        backdropClass="bg-slate-300/75 dark:bg-slate-900/90 action-overlay-backdrop"
        [dismissalPolicy]="dismissalPolicy"
        (dismissed)="ctx.close()">
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

      </m-dialog-shell>
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
  protected readonly dismissalPolicy: DialogDismissalPolicy = { escape: true, backdrop: true }

}
