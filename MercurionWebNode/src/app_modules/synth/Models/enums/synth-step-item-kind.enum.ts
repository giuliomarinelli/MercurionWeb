import { registerEnumType } from '@nestjs/graphql';

export enum SynthStepItemKind {
    Reactant = 'Reactant',
    Reagent = 'Reagent',
    Solvent = 'Solvent',
    Condition = 'Condition',
    Catalyst = 'Catalyst',
    Product = 'Product',
    Byproduct = 'Byproduct',
    Other = 'Other'
}

registerEnumType(SynthStepItemKind, {
    name: 'SynthStepItemKind',
    description: 'Chemical or textual role of an item in a synthetic step'
})
