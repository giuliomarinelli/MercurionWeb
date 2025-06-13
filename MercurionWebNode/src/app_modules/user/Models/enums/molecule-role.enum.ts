import { registerEnumType } from '@nestjs/graphql';

export enum MoleculeRole {
    REACTANT = 'reactant',
    PRODUCT = 'product',
    REAGENT = 'reagent'
}

registerEnumType(MoleculeRole, {
    name: 'MoleculeRole',
    description: 'Ruolo della molecola in una reazione chimica',
})
