import { UUID } from 'crypto'

export interface MoleculeCollectionCreateCommand {
  name: string
}

export interface MoleculeCollectionPatchCommand {
  name?: string
}

export interface MoleculeItemCreateCommand {
  type: string
  canonicalSmiles?: string
  molFormula?: string
  name?: string
  propertiesJson?: string
  chemblMolregno?: number
  label?: string
  notes?: string
}

export interface MoleculeItemPatchCommand {
  canonicalSmiles?: string
  molFormula?: string
  name?: string
  propertiesJson?: string
  chemblMolregno?: number
  label?: string
  notes?: string
}

export interface OwnedMoleculeReference {
  id: UUID
  userId: UUID
}

export function toMoleculeCollectionPatch(input: MoleculeCollectionPatchCommand) {
  return { name: input.name }
}

export function toMoleculeItemCreatePatch(input: MoleculeItemCreateCommand) {
  return {
    type: input.type,
    canonicalSmiles: input.canonicalSmiles,
    molFormula: input.molFormula,
    name: input.name,
    propertiesJson: input.propertiesJson,
    chemblMolregno: input.chemblMolregno,
    label: input.label,
    notes: input.notes,
  }
}

export function toMoleculeItemPatch(input: MoleculeItemPatchCommand) {
  return {
    canonicalSmiles: input.canonicalSmiles,
    molFormula: input.molFormula,
    name: input.name,
    propertiesJson: input.propertiesJson,
    chemblMolregno: input.chemblMolregno,
    label: input.label,
    notes: input.notes,
  }
}
