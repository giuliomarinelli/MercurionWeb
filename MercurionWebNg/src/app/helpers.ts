import { MoleculeCardItemModel, MoleculeCollectionItemClient } from './Models/graphql/molecule-collection/molecule-collection.types';
import { MoleculeProperties } from './Models/graphql/molecule-properties.model';
import { MoleculeDetail } from './Models/graphql/molecule.detail.models';
export class Helpers {

  static normalizeTitleCase(input: string): string {
    if (!input) return '';

    return input
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join(' ');
  }

  static isValidJwt(t: string) {
    return /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){2}$/.test(t);
  }

  static moleculeClientToCardAdapter(mol: MoleculeCollectionItemClient): MoleculeCardItemModel {
    return {
      id: mol.id,
      type: mol.type as 'chembl' | 'custom',
      name: mol.type === 'chembl' ? (mol.chemblDetails as MoleculeDetail)?.preferredName ?? '' : mol.name ?? '',
      syn: mol.type === 'chembl' ? (mol.chemblDetails as MoleculeDetail)?.synonyms?.[0] ?? '' : '',
      mwFreebase: mol.type === 'chembl'
        ? (mol.chemblDetails as MoleculeDetail)?.properties.mwFreebase ?? 0
        : (() => { try { return (JSON.parse(mol.propertiesJson ?? '') as MoleculeProperties).mwFreebase ?? 0 } catch { return 0 } })() as number,
      maxPhase: mol.type === 'chembl' ? (mol.chemblDetails as MoleculeDetail)?.maxPhase ?? 0 : undefined,
      smiles: mol.type === 'chembl' ? (mol.chemblDetails as MoleculeDetail)?.canonicalSmiles ?? '' : mol.canonicalSmiles ?? '',
      createdAt: Date.parse(String(mol.createdAt)),
      updatedAt: Date.parse(String(mol.updatedAt)),
      touchedAt: Date.parse(String(mol.touchedAt))
    }
  }

  static parseMoleculeProperties(json?: string | null): MoleculeProperties | null {
    if (!json) return null;
    try {
      return JSON.parse(json) as MoleculeProperties;
    } catch {
      return null;
    }
  }

}
