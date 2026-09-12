import type { ChemistryEditorMode } from '../../chemistry/chemistry-adapter.models'

export type ActionScope =
  'MoleculeCollectionItemSave'
  | 'AddMoleculesToCollection'
  | 'CreateCollection'
  | 'BindCollectionsToMolecule'
  | 'SensitiveDataChange'
  | 'EssentialProfileRegistryEdit'
  | 'TicketDetail'
  | 'NewTicket'
  | 'SelectCollectionThenRoute'
  | ''

export type ActiveActionScope = Exclude<ActionScope, ''>

export type SaveOverlayFormItem = 'name' | 'label' | 'notes'

export type SensitiveDataChangeInnerScope =
  'EnableMfa'
  | 'ChangePassword'
  | 'ConfigMfa'
  | 'ChangeEmail'
  | 'ChangePhone'
  | 'AddPhone'
  | 'RemovePhone'
  | ''

export type ActiveSensitiveDataChangeInnerScope = Exclude<SensitiveDataChangeInnerScope, ''>

export type TicketDetailInnerScope = 'User' | 'Support'

/**
 * Typed, per-scope input contract captured immutably when an action session opens.
 * Scopes that need no caller-provided input use `void` rather than an untyped optional field.
 */
export interface ActionSessionInputMap {
  MoleculeCollectionItemSave: { readonly mode: ChemistryEditorMode; readonly smiles: string }
  AddMoleculesToCollection: {
    readonly collectionId: string
    readonly redirectToCollectionPath: boolean
    readonly importFromChembl: boolean
  }
  CreateCollection: void
  BindCollectionsToMolecule: { readonly moleculeId: string }
  SensitiveDataChange: { readonly innerScope: ActiveSensitiveDataChangeInnerScope }
  EssentialProfileRegistryEdit: void
  TicketDetail: { readonly ticketId: string; readonly innerScope: TicketDetailInnerScope }
  NewTicket: { readonly innerScope: TicketDetailInnerScope }
  SelectCollectionThenRoute: { readonly importFromChembl: boolean }
}

export type ActionSessionInput<S extends ActiveActionScope> = ActionSessionInputMap[S]

/**
 * Results are deliberately owned by the action contract rather than inferred
 * from a component class. Actions currently complete through their context
 * services and therefore have no value result, but keeping this map explicit
 * makes the contract exhaustive when an action later returns a value.
 */
export interface ActionSessionResultMap {
  MoleculeCollectionItemSave: void
  AddMoleculesToCollection: void
  CreateCollection: void
  BindCollectionsToMolecule: void
  SensitiveDataChange: void
  EssentialProfileRegistryEdit: void
  TicketDetail: void
  NewTicket: void
  SelectCollectionThenRoute: void
}

export type ActionSessionResult<S extends ActiveActionScope> = ActionSessionResultMap[S]

/**
 * A single opening of the action overlay. `id` doubles as the state machine generation
 * token: it stays constant for the full opening/active/submitting/settled lifecycle of
 * one session and changes on every new OPEN/CLOSE, so it can be used to reject late
 * async work that originated from a previous, no-longer-current session.
 */
export interface ActionSession<S extends ActiveActionScope = ActiveActionScope> {
  readonly id: number
  readonly scope: S
  readonly input: ActionSessionInputMap[S]
}

export type ActionOverlayState =
  | { readonly phase: 'closed'; readonly generation: number }
  | { readonly phase: 'opening'; readonly scope: ActiveActionScope; readonly generation: number; readonly input: unknown }
  | { readonly phase: 'active'; readonly scope: ActiveActionScope; readonly generation: number; readonly input: unknown }
  | { readonly phase: 'submitting'; readonly scope: ActiveActionScope; readonly generation: number; readonly input: unknown }
  | { readonly phase: 'succeeded'; readonly scope: ActiveActionScope; readonly generation: number; readonly input: unknown }
  | { readonly phase: 'failed'; readonly scope: ActiveActionScope; readonly generation: number; readonly input: unknown }
  | { readonly phase: 'closing'; readonly scope: ActiveActionScope; readonly generation: number; readonly input: unknown }
  | { readonly phase: 'settling'; readonly scope: ActiveActionScope; readonly generation: number; readonly input: unknown }

export type ActionOverlayEvent =
  | { readonly type: 'OPEN'; readonly scope: ActiveActionScope; readonly input: unknown }
  | { readonly type: 'ACTIVATE'; readonly generation: number }
  | { readonly type: 'SUBMIT'; readonly sessionId: number }
  | { readonly type: 'SUBMIT_SUCCEEDED'; readonly sessionId: number }
  | { readonly type: 'SUBMIT_FAILED'; readonly sessionId: number }
  | { readonly type: 'CANCEL'; readonly sessionId?: number }
  | { readonly type: 'CLOSE'; readonly sessionId?: number }
  | { readonly type: 'UNMOUNT'; readonly generation: number }
  | { readonly type: 'CLEAR'; readonly generation: number }
