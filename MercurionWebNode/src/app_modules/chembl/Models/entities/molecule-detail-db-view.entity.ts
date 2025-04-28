import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({
    name: 'molecule_detail_view',
    synchronize: false,
})
export class MoleculeDetailDBView {

    @ViewColumn()
    id: number

    @ViewColumn()
    cmbId: string

    @ViewColumn()
    preferredName: string

    @ViewColumn()
    canonicalSmiles: string

    @ViewColumn()
    standardInchi: string

    @ViewColumn()
    standardInchiKey: string

    @ViewColumn()
    molFormula: string

    @ViewColumn()
    mwFreebase: number

    @ViewColumn()
    alogp: number

    @ViewColumn()
    hba: number

    @ViewColumn()
    hbd: number

    @ViewColumn()
    psa: number

    @ViewColumn()
    rtb: number

    @ViewColumn()
    maxPhase: number

    @ViewColumn()
    moleculeType: string

    @ViewColumn()
    oral: boolean

    @ViewColumn()
    parenteral: boolean

    @ViewColumn()
    topical: boolean

    @ViewColumn()
    naturalProduct: boolean

    @ViewColumn()
    prodrug: boolean

    @ViewColumn()
    blackBoxWarning: boolean

    @ViewColumn()
    synonyms: string
}
