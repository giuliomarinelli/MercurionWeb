import { createUnionType } from '@nestjs/graphql';
import { ChEMBLMoleculeItemDTO } from './chembl-molecule-item.dto';
import { CustomMoleculeItemDTO } from './custom-molecule-item.dto'

export type MoleculeCollectionItemDTO =
    | CustomMoleculeItemDTO
    | ChEMBLMoleculeItemDTO;

export function resolveMoleculeCollectionItemType(
    value: unknown
): typeof CustomMoleculeItemDTO | typeof ChEMBLMoleculeItemDTO | null {
    if (!value || typeof value !== 'object' || !('type' in value)) {
        return null
    }
    if (value.type === 'custom') return CustomMoleculeItemDTO
    if (value.type === 'chembl') return ChEMBLMoleculeItemDTO
    return null
}

export const MoleculeCollectionItemUnion = createUnionType({
    name: 'MoleculeCollectionItemUnion',
    types: () => [CustomMoleculeItemDTO, ChEMBLMoleculeItemDTO] as const,
    resolveType: resolveMoleculeCollectionItemType,
});
