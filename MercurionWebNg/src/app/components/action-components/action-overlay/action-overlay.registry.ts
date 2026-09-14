import type { Type } from '@angular/core'
import type {
  ActiveActionScope,
  ActionSessionInput,
  ActionSessionInputMap,
  ActionSessionResult,
  ActionSessionResultMap
} from '../../../Models/action/action-overlay.models'

export type ActionInputMetadata<S extends ActiveActionScope> =
  ActionSessionInput<S> extends void
    ? { readonly kind: 'none' }
    : { readonly kind: 'required' }

export type ActionResultMetadata<S extends ActiveActionScope> =
  ActionSessionResult<S> extends void
    ? { readonly kind: 'none' }
    : { readonly kind: 'value' }

export interface ActionDefinition<S extends ActiveActionScope> {
  readonly label: string
  readonly input: ActionInputMetadata<S>
  readonly result: ActionResultMetadata<S>
  readonly load: () => Promise<Type<unknown>>
}

export type ActionRegistry = {
  readonly [S in ActiveActionScope]: ActionDefinition<S>
}

type ActionLoader<S extends ActiveActionScope> = () => Promise<Type<unknown>>

function defineAction<S extends ActiveActionScope>(
  definition: ActionDefinition<S>
): ActionDefinition<S> {
  return definition
}

/**
 * The only authority for action implementation loading and overlay metadata.
 *
 * `satisfies ActionRegistry` intentionally keeps this registry exhaustive:
 * adding a scope to ActionSessionInputMap without adding its entry is a
 * compile-time error.
 */
export const ACTION_REGISTRY = {
  MoleculeCollectionItemSave: defineAction({
    label: 'Salva elemento della collezione',
    input: { kind: 'required' },
    result: { kind: 'none' },
    load: (() => import('../custom-molecule-collection-item-save/custom-molecule-collection-item-save.component')
      .then(({ CustomMoleculeCollectionItemSaveComponent }) => CustomMoleculeCollectionItemSaveComponent)) as ActionLoader<'MoleculeCollectionItemSave'>
  }),
  AddMoleculesToCollection: defineAction({
    label: 'Aggiungi molecole alla collezione',
    input: { kind: 'required' },
    result: { kind: 'none' },
    load: (() => import('../add-molecules-to-collection/add-molecules-to-collection.component')
      .then(({ AddMoleculesToCollectionComponent }) => AddMoleculesToCollectionComponent)) as ActionLoader<'AddMoleculesToCollection'>
  }),
  CreateCollection: defineAction({
    label: 'Crea una nuova collezione',
    input: { kind: 'none' },
    result: { kind: 'none' },
    load: (() => import('../create-collection/create-collection.component')
      .then(({ CreateCollectionComponent }) => CreateCollectionComponent)) as ActionLoader<'CreateCollection'>
  }),
  BindCollectionsToMolecule: defineAction({
    label: 'Associa collezioni alla molecola',
    input: { kind: 'required' },
    result: { kind: 'none' },
    load: (() => import('../bind-collections-to-molecule/bind-collections-to-molecule.component')
      .then(({ BindCollectionsToMoleculeComponent }) => BindCollectionsToMoleculeComponent)) as ActionLoader<'BindCollectionsToMolecule'>
  }),
  SensitiveDataChange: defineAction({
    label: 'Modifica dati sensibili',
    input: { kind: 'required' },
    result: { kind: 'none' },
    load: (() => import('../sensitive-data-change/sensitive-data-change.component')
      .then(({ SensitiveDataChangeComponent }) => SensitiveDataChangeComponent)) as ActionLoader<'SensitiveDataChange'>
  }),
  EssentialProfileRegistryEdit: defineAction({
    label: 'Modifica dati profilo',
    input: { kind: 'none' },
    result: { kind: 'none' },
    load: (() => import('../profile-registry-edit/essential-profile-registry-edit.component')
      .then(({ EssentialProfileRegistryEditComponent }) => EssentialProfileRegistryEditComponent)) as ActionLoader<'EssentialProfileRegistryEdit'>
  }),
  TicketDetail: defineAction({
    label: 'Dettaglio ticket',
    input: { kind: 'required' },
    result: { kind: 'none' },
    load: (() => import('../ticket-detail/ticket-detail.component')
      .then(({ TicketDetailComponent }) => TicketDetailComponent)) as ActionLoader<'TicketDetail'>
  }),
  NewTicket: defineAction({
    label: 'Nuovo ticket',
    input: { kind: 'required' },
    result: { kind: 'none' },
    load: (() => import('../new-ticket/new-ticket.component')
      .then(({ NewTicketComponent }) => NewTicketComponent)) as ActionLoader<'NewTicket'>
  }),
  SelectCollectionThenRoute: defineAction({
    label: 'Seleziona collezione',
    input: { kind: 'required' },
    result: { kind: 'none' },
    load: (() => import('../select-collection-then-route/select-collection-then-route.component')
      .then(({ SelectCollectionThenRouteComponent }) => SelectCollectionThenRouteComponent)) as ActionLoader<'SelectCollectionThenRoute'>
  })
} satisfies ActionRegistry

export type ActionDefinitionFor<S extends ActiveActionScope> = typeof ACTION_REGISTRY[S]

export type ActionInputFor<S extends ActiveActionScope> = ActionSessionInputMap[S]
export type ActionResultFor<S extends ActiveActionScope> = ActionSessionResultMap[S]
