import { ViewEntity, ViewColumn } from "typeorm";

@ViewEntity({ name: 'molecule_preview_view', synchronize: false })
export class MoleculePreviewView {
    
    @ViewColumn()
    id: number; // molregno

    @ViewColumn({ name: 'cmb_id' })
    cmbId: string; // chembl_id

    @ViewColumn({ name: 'preferred_name' })
    preferredName: string | null;

    @ViewColumn()
    synonyms: string | null; // aggregati con string_agg

    @ViewColumn()
    smiles: string; // canonical_smiles

    @ViewColumn({ name: 'mw_freebase' })
    mwFreebase: number | null;

    @ViewColumn()
    alogp: number | null;

    @ViewColumn()
    hba: number | null;

    @ViewColumn()
    hbd: number | null;

    @ViewColumn()
    psa: number | null;

    @ViewColumn()
    rtb: number | null;

    @ViewColumn({ name: 'max_phase' })
    maxPhase: number | null;

    @ViewColumn({ name: 'molecule_type' })
    moleculeType: string | null;

    @ViewColumn({ name: 'oral_admin' })
    oralAdmin: boolean | null;

    @ViewColumn({ name: 'parenteral_admin' })
    parenteralAdmin: boolean | null;

    @ViewColumn({ name: 'topical_admin' })
    topicalAdmin: boolean | null;

    @ViewColumn({ name: 'black_box_warning_flag' })
    blackBoxWarningFlag: boolean | null;

    @ViewColumn({ name: 'natural_product_flag' })
    naturalProductFlag: boolean | null;

    @ViewColumn({ name: 'prodrug_flag' })
    prodrugFlag: boolean | null;
}
