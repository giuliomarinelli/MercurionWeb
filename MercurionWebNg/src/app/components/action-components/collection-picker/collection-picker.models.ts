import { MoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';

export type CollectionPickerMode =
  | {
    kind: 'single';
    operation: 'route' | 'save';
    allowCreate: boolean;
  }
  | {
    kind: 'multi';
    operation: 'bind';
    moleculeId: string;
  };

export interface CollectionPickerInput {
  mode: CollectionPickerMode;
  pageSize?: number;
  initialSelection?: readonly string[];
}

export interface CollectionPickerSelection {
  ids: readonly string[];
  collections: readonly MoleculeCollection[];
  selectAll: boolean;
  excludedIds: readonly string[];
}

