// molecule-doc.interface.ts
export interface MoleculeProperties {
  mwFreebase: number | null;
  alogp: number | null;
  hba: number | null;
  hbd: number | null;
  psa: number | null;
  rtb: number | null;
}

export interface AdministrationRoutes {
  oral: boolean;
  parenteral: boolean;
  topical: boolean;
}

export interface Activity {
  actionType: string | null;
  value: number | null;
  unit: string | null;
  assayDescription: string | null;
  targetName: string | null;
  targetOrganism: string | null;
}

export interface ToxicityData {
  warningType: string | null;
  warningDescription: string | null;
}

export interface MoleculeDoc {
  id: number;                       // molregno
  cmbId: string;
  preferredName: string | null;
  canonicalSmiles: string;
  standardInchi: string | null;
  standardInchiKey: string | null;
  molFormula: string | null;
  properties: MoleculeProperties;
  maxPhase: number | null;
  moleculeType: string | null;
  administrationRoutes: AdministrationRoutes;
  naturalProduct: boolean;
  prodrug: boolean;
  blackBoxWarning: boolean;
  synonyms: string[];
  activities: Activity[];
  toxicityData: ToxicityData[];
}
