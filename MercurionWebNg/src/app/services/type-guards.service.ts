import { Injectable } from "@angular/core";
import { MoleculeDetailSystem } from "../Models/graphql/molecule.detail.models";
import { ChEMBLMoleculeItemEntity, CustomMoleculeItemEntity, MoleculeCollectionItemClient, MoleculeCollectionItemEntityShort, MoleculeDetailItem } from "../Models/graphql/molecule-collection/molecule-collection.types";

@Injectable({ providedIn: 'root' })
export class TypeGuardsService {
  // chembl
  isChemblMolecule(item: MoleculeDetailItem): item is ChEMBLMoleculeItemEntity;
  isChemblMolecule(item: MoleculeCollectionItemClient): item is Extract<MoleculeCollectionItemClient, { type: 'chembl' }>;
  isChemblMolecule(item: MoleculeCollectionItemEntityShort): item is MoleculeCollectionItemEntityShort & { type: 'chembl' };
  isChemblMolecule(item: any): boolean {
    return item?.type === 'chembl';
  }


  // custom
  isCustomMolecule(item: MoleculeDetailItem): item is CustomMoleculeItemEntity;
  isCustomMolecule(
    item: MoleculeCollectionItemEntityShort
  ): item is MoleculeCollectionItemEntityShort & { type: 'custom' };
  isCustomMolecule(item: any): boolean {
    return item?.type === 'custom';
  }

  // system (solo per detail)
  isSystemMolecule(item: MoleculeDetailItem): item is MoleculeDetailSystem {
    return item?.type === 'system';
  }

  isUserMoleculeType(item: 'chembl' | 'custom' | 'system'): item is 'chembl' | 'custom' {
    return item !== 'system'
  }

  isCustomMoleculeType(item: 'chembl' | 'custom' | 'system'): item is 'custom' {
    return item === 'custom'
  }

  isString(item: unknown): item is string {
    return typeof item === 'string'
  }

}
