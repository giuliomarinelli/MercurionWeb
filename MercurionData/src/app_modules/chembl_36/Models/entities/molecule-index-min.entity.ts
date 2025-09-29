// src/app_modules/chembl_36/entities/molecule-index-min.entity.ts
import { ViewEntity, ViewColumn, PrimaryColumn } from 'typeorm';

@ViewEntity({ name: 'molecule_index_mv', schema: 'public', synchronize: false })
export class MoleculeIndexMinView {
  @PrimaryColumn('uuid', { name: 'stable_uuid' })
  stableUuid!: string;

  @ViewColumn({ name: 'id' })
  molregno!: number;

  @ViewColumn({ name: 'canonical_smiles' })
  smiles!: string;
}
