export type ActionScope =
  'MoleculeCollectionItemSave'
  | 'AddMoleculesToCollection'
  | 'CreateCollection'
  | 'BindCollectionsToMolecule'
  | 'SensitiveDataChange'
  | 'EssentialProfileRegistryEdit'
  | 'TicketDetail'
  | ''

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
