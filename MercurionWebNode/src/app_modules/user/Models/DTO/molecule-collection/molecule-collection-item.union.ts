import { createUnionType } from "@nestjs/graphql";
import { ChEMBLMoleculeItemDTO } from "./chembl-molecule-item.dto";
import { CustomMoleculeItemDTO } from './custom-molecule-item.dto'
export const MoleculeCollectionItemUnion = createUnionType({
    name: 'MoleculeCollectionItemUnion',
    types: () => [CustomMoleculeItemDTO, ChEMBLMoleculeItemDTO] as const,
    resolveType: value => {
        if (value.type === 'custom') return CustomMoleculeItemDTO
        if (value.type === 'chembl') return ChEMBLMoleculeItemDTO
        return null;
    },
});