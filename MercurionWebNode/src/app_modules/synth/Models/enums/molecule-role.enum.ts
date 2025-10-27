import { registerEnumType } from '@nestjs/graphql';

export enum MoleculeRole {
    Reactant = 'Reactant',
    Substrate = 'Substrate',
    Product = 'Product',
    SubProduct = 'SubProduct'
}

registerEnumType(MoleculeRole, {
    name: 'MoleculeRole',
    description: 'Ruolo della molecola in una reazione chimica',
})
