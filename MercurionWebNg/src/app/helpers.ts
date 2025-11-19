import { signal } from '@angular/core';
import { MoleculeCardItemModel, MoleculeCollectionItemClient } from './Models/graphql/molecule-collection/molecule-collection.types';
import { MoleculeProperties } from './Models/graphql/molecule-properties.model';
import { MoleculeSearchResult } from './Models/graphql/molecule-search/molecule-search-result.interface';
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

  static moleculeClientToCardConverter(mol: MoleculeCollectionItemClient): MoleculeCardItemModel {
    return {
      id: mol.id,
      type: mol.type as 'chembl' | 'custom',
      name: mol.type === 'chembl' ? (mol.chemblDetails as MoleculeDetail)?.preferredNameIt ?? (mol.chemblDetails as MoleculeDetail)?.preferredName ?? `Lead ${(mol.chemblDetails as MoleculeDetail)?.id}` : mol.name ?? 'Lead sconosciuto',
      syn: mol.type === 'chembl' ? (mol.chemblDetails as MoleculeDetail)?.synonyms?.[0] ?? '' : '',
      mwFreebase: mol.type === 'chembl'
        ? (mol.chemblDetails as MoleculeDetail)?.properties.mwFreebase ?? 0
        : (() => { try { return (JSON.parse(mol.propertiesJson ?? '') as MoleculeProperties).mwFreebase ?? 0 } catch { return 0 } })() as number,
      maxPhase: mol.type === 'chembl' ? (mol.chemblDetails as MoleculeDetail)?.maxPhase ?? 0 : undefined,
      smiles: mol.type === 'chembl' ? (mol.chemblDetails as MoleculeDetail)?.canonicalSmiles ?? '' : mol.canonicalSmiles ?? '',
      createdAt: Date.parse(String(mol.createdAt)),
      updatedAt: Date.parse(String(mol.updatedAt)),
      touchedAt: Date.parse(String(mol.touchedAt)),
      triggerDisappear: signal<boolean>(false),
      collapse: signal<boolean>(false)
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

  static moleculeSearchResultToMoleculeCardItemModelConverter(dto: MoleculeSearchResult): MoleculeCardItemModel {
    const now = Date.now()
    return ({
      id: dto.id.toString(),
      name: dto.preferredName,
      smiles: dto.smiles!,
      syn: dto.synonyms && dto.synonyms.length !== 0 ? dto.synonyms[0] : '',
      type: 'chembl',
      mwFreebase: dto.mwFreebase,
      maxPhase: dto.maxPhase,
      createdAt: now,
      touchedAt: now,
      updatedAt: now,
      triggerDisappear: signal<boolean>(false),
      collapse: signal<boolean>(false)
    })
  }

}
