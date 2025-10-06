import { Injectable } from '@angular/core';
import { ChEMBLMoleculeItemEntity, CustomMoleculeItemEntity, MoleculeCollectionItem } from './Models/graphql/molecule-collection/molecule-collection.types';

@Injectable({
  providedIn: 'root'
})
export class TypeGuardsService {

  isChembl(
    item: MoleculeCollectionItem
  ): item is ChEMBLMoleculeItemEntity {
    return item.type === 'chembl';
  }

  isCustom(
    item: MoleculeCollectionItem
  ): item is CustomMoleculeItemEntity {
    return item.type === 'custom';
  }
}
