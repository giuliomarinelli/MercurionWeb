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

export type ActionOverlayState =
  | { readonly phase: 'closed'; readonly generation: number }
  | { readonly phase: 'opening'; readonly scope: ActiveActionScope; readonly generation: number }
  | { readonly phase: 'active'; readonly scope: ActiveActionScope; readonly generation: number }
  | { readonly phase: 'submitting'; readonly scope: ActiveActionScope; readonly generation: number }
  | { readonly phase: 'succeeded'; readonly scope: ActiveActionScope; readonly generation: number }
  | { readonly phase: 'failed'; readonly scope: ActiveActionScope; readonly generation: number }
  | { readonly phase: 'closing'; readonly scope: ActiveActionScope; readonly generation: number }
  | { readonly phase: 'settling'; readonly scope: ActiveActionScope; readonly generation: number }

export type ActionOverlayEvent =
  | { readonly type: 'OPEN'; readonly scope: ActiveActionScope }
  | { readonly type: 'ACTIVATE'; readonly generation: number }
  | { readonly type: 'SUBMIT' }
  | { readonly type: 'SUBMIT_SUCCEEDED' }
  | { readonly type: 'SUBMIT_FAILED' }
  | { readonly type: 'CANCEL' }
  | { readonly type: 'CLOSE' }
  | { readonly type: 'UNMOUNT'; readonly generation: number }
  | { readonly type: 'CLEAR'; readonly generation: number }

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

export type TicketDetailInnerScope = 'User' | 'Support'
