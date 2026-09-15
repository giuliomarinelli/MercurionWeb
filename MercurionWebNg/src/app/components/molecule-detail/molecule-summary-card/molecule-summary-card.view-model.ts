import { MoleculeCardItemModel } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface';

export type MoleculeSummaryAction =
  | { readonly kind: 'link'; readonly label: string; readonly href: string; readonly queryParams?: Record<string, string> }
  | { readonly kind: 'button'; readonly label: string; readonly action: 'delete' | 'remove' | 'select' };

export type MoleculeSummaryViewModel =
  | {
      readonly source: 'saved';
      readonly id: string;
      readonly name: string;
      readonly synonym: string;
      readonly smiles: string;
      readonly molecularWeight?: number;
      readonly phase?: number;
      readonly createdAt?: number;
      readonly updatedAt?: number;
      readonly badge?: string;
      readonly actions: readonly MoleculeSummaryAction[];
      readonly selectable: boolean;
      readonly compact: boolean;
    }
  | {
      readonly source: 'search' | 'external';
      readonly id: string;
      readonly name: string;
      readonly synonym: string;
      readonly smiles: string;
      readonly molecularWeight?: number;
      readonly phase?: number;
      readonly createdAt?: number;
      readonly updatedAt?: number;
      readonly badge?: string;
      readonly actions: readonly MoleculeSummaryAction[];
      readonly selectable: boolean;
      readonly compact: boolean;
    };

export function moleculeCardToSummary(
  molecule: MoleculeCardItemModel,
  options: Pick<MoleculeSummaryViewModel & { source: 'saved' }, 'actions' | 'selectable' | 'compact'> = {
    actions: [],
    selectable: false,
    compact: false
  }
): MoleculeSummaryViewModel {
  return {
    source: 'saved',
    id: molecule.id,
    name: molecule.name,
    synonym: molecule.syn,
    smiles: molecule.smiles,
    molecularWeight: molecule.mwFreebase,
    phase: molecule.maxPhase,
    createdAt: molecule.createdAt,
    updatedAt: molecule.updatedAt,
    badge: molecule.type === 'chembl' ? 'ChEMBL' : undefined,
    ...options
  };
}

export function searchResultToSummary(
  molecule: MoleculeSearchResult,
  options: Pick<MoleculeSummaryViewModel & { source: 'search' }, 'actions' | 'selectable' | 'compact'> = {
    actions: [],
    selectable: false,
    compact: true
  }
): MoleculeSummaryViewModel {
  return {
    source: 'search',
    id: String(molecule.id),
    name: molecule.preferredNameIt ?? molecule.preferredName ?? `Lead ${molecule.id}`,
    synonym: molecule.synonyms?.find(Boolean) ?? '',
    smiles: molecule.smiles ?? '',
    molecularWeight: molecule.mwFreebase ?? undefined,
    phase: molecule.maxPhase ?? undefined,
    badge: molecule.known ? 'Già salvata' : undefined,
    ...options
  };
}
