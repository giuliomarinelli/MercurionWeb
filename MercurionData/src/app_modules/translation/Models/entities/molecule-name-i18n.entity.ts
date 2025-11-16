    import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'molecule_name_i18n' })
export class MoleculeNameI18n {

    @PrimaryColumn({ name: 'molregno', type: 'int' })
    molregno: number

    @Column({ name: 'preferred_en', type: 'text' })
    preferredEn: string

    @Column({ name: 'preferred_it', type: 'text', nullable: true })
    preferredIt: string | null

    @Column({ name: 'updated_at', type: 'bigint', default: () => 'NOW()' })
    updatedAt: Date

}
