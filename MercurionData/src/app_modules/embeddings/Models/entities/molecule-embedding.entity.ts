// src/app_modules/embeddings/entities/molecule-embedding.entity.ts
import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ name: 'molecule_embeddings' })
export class MoleculeEmbedding {
  @PrimaryColumn('uuid', { name: 'stable_uuid' })
  stableUuid!: string;

  @Column('integer', { name: 'molregno' })
  molregno!: number;

  @Column('text', { name: 'smiles' })
  smiles!: string;

  @Column('varchar', { name: 'preferred_name', default: null })
  preferredName: string | null

  // pgvector (Nullable finché non calcoliamo)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  @Column({ type: 'vector' as any, nullable: true })
  embedding!: number[] | null;

  @Column('text', { name: 'embedding_model', default: 'seyonec/ChemBERTa-zinc-base-v1' })
  embeddingModel!: string;

  @Column('timestamptz', { name: 'updated_at', default: () => 'now()' })
  updatedAt!: Date;
}
