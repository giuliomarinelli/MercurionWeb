import type {
  FindOneCustomMoleculeByCanonicalSmilesQuery,
  MoleculeItemBasicDataQuery,
  MoleculeItemShortQuery
} from '../../generated/graphql';
import type { NormalizedMoleculeCollectionBasicData } from '../../Models/graphql/molecule.detail.models';
import type {
  MoleculeCollectionItemClient,
  MoleculeCollectionItemEntityShort,
  MoleculeCollectionJoin,
  MoleculeItemDTO,
  MoleculeItemLookup
} from '../../Models/graphql/molecule-collection/molecule-collection.types';

function toNumber(value: string | number): number {
  return typeof value === 'number' ? value : Number(value);
}

function mapJoins(joins: MoleculeItemDTO['joins']): MoleculeCollectionJoin[] {
  return (joins ?? []).flatMap(join => join.collection
    ? [{ id: join.id, collection: join.collection }]
    : []);
}

export function mapMoleculeItemDtoToClient(
  node: MoleculeItemDTO
): MoleculeCollectionItemClient {
  const common = {
    id: node.id,
    label: node.label ?? null,
    notes: node.notes ?? null,
    joins: mapJoins(node.joins),
    createdAt: String(node.createdAt),
    updatedAt: String(node.updatedAt),
    touchedAt: String(node.touchedAt)
  };

  if (node.__typename === 'ChEMBLMoleculeItemDTO') {
    return {
      ...common,
      type: 'chembl',
      chemblMolregno: toNumber(node.chemblMolregno),
      chemblDetails: node.chemblDetails
    };
  }

  return {
    ...common,
    type: 'custom',
    canonicalSmiles: node.canonicalSmiles,
    molFormula: node.molFormula ?? null,
    name: node.name ?? null,
    propertiesJson: node.propertiesJson ?? null
  };
}

export function mapMoleculeItemBasicData(
  node: MoleculeItemBasicDataQuery['myMoleculeItems'][number]
): NormalizedMoleculeCollectionBasicData {
  if (node.__typename === 'ChEMBLMoleculeItemDTO') {
    return {
      id: node.id,
      name: node.chemblDetails?.preferredName
        ?? node.chemblDetails?.preferredNameIt
        ?? '',
      canonicalSmiles: node.chemblDetails?.canonicalSmiles ?? '',
      type: 'chembl'
    };
  }

  return {
    id: node.id,
    name: node.name ?? 'Lead sconosciuto',
    canonicalSmiles: node.canonicalSmiles,
    type: 'custom'
  };
}

export function mapMoleculeItemShort(
  node: NonNullable<MoleculeItemShortQuery['moleculeItem']>
): MoleculeCollectionItemEntityShort {
  return {
    id: node.id,
    type: node.__typename === 'ChEMBLMoleculeItemDTO' ? 'chembl' : 'custom',
    chemblMolregno: node.__typename === 'ChEMBLMoleculeItemDTO'
      ? toNumber(node.chemblMolregno)
      : undefined
  };
}

export function mapCustomMoleculeLookup(
  node: NonNullable<
    FindOneCustomMoleculeByCanonicalSmilesQuery['findOneCustomMoleculeByCanonicalSmiles']
  >
): MoleculeItemLookup {
  return {
    id: node.id,
    type: 'custom',
    canonicalSmiles: node.canonicalSmiles,
    name: node.name
  };
}
