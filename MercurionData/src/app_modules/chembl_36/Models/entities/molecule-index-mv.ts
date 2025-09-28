import { ViewEntity, ViewColumn, PrimaryColumn } from 'typeorm';
import type { MoleculeDoc } from '../DTO/molecule-detail.dtos';


@ViewEntity({
    name: 'molecule_index_mv',
    schema: 'public', // cambia se usi schema diverso
})
export class MoleculeIndexView {
    @PrimaryColumn('uuid', { name: 'stable_uuid' })
    stableUuid: string;

    @ViewColumn({ name: 'doc' })
    doc: MoleculeDoc;
}
