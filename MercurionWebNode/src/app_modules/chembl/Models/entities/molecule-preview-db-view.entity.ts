import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'molecule_preview_view' })
export class MoleculePreviewDBView {
    @PrimaryColumn({ name: 'id', type: 'int' })
    id: number

    @Column({ name: 'cmb_id' })
    cmbId: string

    @Column({ name: 'preferred_name', nullable: true })
    preferredName?: string

    @Column({ name: 'synonyms', nullable: true })
    synonyms?: string

    @Column({ name: 'smiles', type: 'text', nullable: true })
    smiles?: string

    @Column({ name: 'standard_inchi_key', nullable: true })
    standardInchiKey?: string

    @Column({ name: 'mw_freebase', type: 'float', nullable: true })
    mwFreebase?: number

    @Column({ name: 'alogp', type: 'float', nullable: true })
    alogp?: number

    @Column({ name: 'hba', type: 'int', nullable: true })
    hba?: number

    @Column({ name: 'hbd', type: 'int', nullable: true })
    hbd?: number

    @Column({ name: 'psa', type: 'float', nullable: true })
    psa?: number

    @Column({ name: 'rtb', type: 'int', nullable: true })
    rtb?: number

    @Column({ name: 'max_phase', type: 'int', nullable: true })
    maxPhase?: number

    @Column({ name: 'molecule_type', nullable: true })
    moleculeType?: string

    @Column({ name: 'oral_admin', type: 'int', nullable: true })
    oralAdmin?: number

    @Column({ name: 'parenteral_admin', type: 'int', nullable: true })
    parenteralAdmin?: number

    @Column({ name: 'topical_admin', type: 'int', nullable: true })
    topicalAdmin?: number

    @Column({ name: 'black_box_warning_flag', type: 'int', nullable: true })
    blackBoxWarningFlag?: number

    @Column({ name: 'natural_product_flag', type: 'int', nullable: true })
    naturalProductFlag?: number

    @Column({ name: 'prodrug_flag', type: 'int', nullable: true })
    prodrugFlag?: number
}
