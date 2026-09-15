import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { ColumnType } from 'typeorm';

@Entity({ name: 'molecule_embeddings' })
export class MoleculeEmbedding {
    @PrimaryColumn('uuid', { name: 'stable_uuid' })
    stableUuid!: string;

    @Column('integer', { name: 'molregno' })
    molregno!: number;

    @Column('text', { name: 'smiles' })
    smiles!: string;

    // pgvector is provided by the installed driver although TypeORM's
    // portable ColumnType union does not include the extension.
    @Column({ type: 'vector' as ColumnType, nullable: true })
    embedding!: number[] | null;

    @Column('text', { name: 'embedding_model', default: 'seyonec/ChemBERTa-zinc-base-v1' })
    embeddingModel!: string;

    @Column('timestamptz', { name: 'updated_at', default: () => 'now()' })
    updatedAt!: Date;
}
