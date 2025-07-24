// --- TYPE DEFINITIONS (semplificate) ---
export interface MoleculeCollectionJoin {
  id: string;
  collection: { id: string; name: string; };
}
export interface BaseMoleculeItem {
  id: string;
  label?: string | null;
  notes?: string | null;
  type: 'chembl' | 'custom';
  joins: MoleculeCollectionJoin[];
}
export interface ChEMBLMoleculeItemEntity extends BaseMoleculeItem {
  type: 'chembl';
  chemblMolregno: number;
}
export interface CustomMoleculeItemEntity extends BaseMoleculeItem {
  type: 'custom';
  canonicalSmiles: string;
  molFormula?: string | null;
  name?: string | null;
  propertiesJson?: string | null;
}
export type MoleculeCollectionItem = ChEMBLMoleculeItemEntity | CustomMoleculeItemEntity;

export interface CreateMoleculeItemInput {
  type: 'chembl' | 'custom';
  canonicalSmiles?: string;
  molFormula?: string;
  name?: string;
  propertiesJson?: string;
  chemblMolregno?: number;
  label?: string;
  notes?: string;
}

export interface CustomMoleculeItemInput {
  canonicalSmiles: string;
  label?: string;
  notes?: string;
  molFormula?: string;
  name?: string;
  propertiesJson?: string; // da serializzare via JSON.stringify(properties)
}

export interface CustomMoleculeItemEntity {
  id: string;
  type: 'custom';
  label?: string | null;
  notes?: string | null;
  canonicalSmiles: string;
  molFormula?: string | null;
  name?: string | null;
  propertiesJson?: string | null;
  joins: { id: string; collection: { id: string; name: string } }[];
  // Getter derivato (non in DB, aggiunto in UI):
  properties?: MoleculeProperties | null;
}

export interface AddCustomMoleculeToCollectionInput {
  collectionId: string;
  input: CustomMoleculeItemInput;
}

export interface AddChemblMoleculeToCollectionInput {
  collectionId: string;
  chemblMolregno: number;
  label?: string;
  notes?: string;
}

export interface MoleculeProperties {
  mwFreebase: number | string;
  alogp: number | string;
  hba: number;
  hbd: number;
  psa: number | string;
  rtb: number;
}

export interface MoleculeCollectionItemJoinShort {
  id: string;
  item: { id: string; label?: string | null; type: string; };
}
export interface MoleculeCollection {
  id: string;
  name: string;
  items?: MoleculeCollectionItemJoinShort[];
}

