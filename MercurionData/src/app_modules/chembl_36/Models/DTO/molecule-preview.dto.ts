export interface MoleculePreviewDTO {
    id: number; // molregno
    cmbId: string; // chembl_id
    preferredName: string | null;
    synonyms: string[]; // aggregati con string_agg
    smiles: string; // canonical_smiles
    mwFreebase: number | null;
    alogp: number | null;
    hba: number | null;
    hbd: number | null;
    psa: number | null;
    rtb: number | null;
    maxPhase: number | null;
    moleculeType: string | null;
    oralAdmin: boolean | null;
    parenteralAdmin: boolean | null;
    topicalAdmin: boolean | null;
    blackBoxWarningFlag: boolean | null;
    naturalProductFlag: boolean | null
    prodrugFlag: boolean | null;
}


