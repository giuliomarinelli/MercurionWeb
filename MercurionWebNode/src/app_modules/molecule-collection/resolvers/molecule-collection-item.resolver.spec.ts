import { readFileSync } from 'fs';
import { join } from 'path';
import { LazyMetadataStorage } from '@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage';
import { TypeMetadataStorage } from '@nestjs/graphql/dist/schema-builder/storages/type-metadata.storage';
import { buildSchema, graphql } from 'graphql';
import { ChEMBLMoleculeItemDTO } from '../Models/DTO/chembl-molecule-item.dto';
import { CustomMoleculeItemDTO } from '../Models/DTO/custom-molecule-item.dto';
import {
  resolveMoleculeCollectionItemType
} from '../Models/DTO/molecule-collection-item.union';

describe('MoleculeCollectionItem GraphQL polymorphism', () => {
  const customItem: CustomMoleculeItemDTO = {
    id: '01900000-0000-7000-8000-000000000001',
    label: 'Custom lead',
    notes: null,
    type: 'custom',
    canonicalSmiles: 'CCO',
    molFormula: 'C2H6O',
    name: 'Ethanol',
    propertiesJson: null,
    createdAt: 1,
    updatedAt: 2,
    touchedAt: 3,
    joins: [],
  };
  const chemblItem: ChEMBLMoleculeItemDTO = {
    id: '01900000-0000-7000-8000-000000000002',
    chemblMolregno: '42',
    label: 'ChEMBL lead',
    notes: null,
    type: 'chembl',
    createdAt: 4,
    updatedAt: 5,
    touchedAt: 6,
    chemblDetails: null,
    joins: [],
  };

  it.each([
    [customItem, CustomMoleculeItemDTO],
    [chemblItem, ChEMBLMoleculeItemDTO],
  ])('resolves the DTO class matching the runtime discriminant', (item, expectedType) => {
    expect(resolveMoleculeCollectionItemType(item)).toBe(expectedType);
  });

  it('rejects unrepresented runtime shapes', () => {
    expect(resolveMoleculeCollectionItemType({ type: 'other' })).toBeNull();
    expect(resolveMoleculeCollectionItemType(null)).toBeNull();
  });

  it('declares explicit GraphQL String metadata for literal and nullable DTO fields', () => {
    LazyMetadataStorage.load([CustomMoleculeItemDTO, ChEMBLMoleculeItemDTO]);
    TypeMetadataStorage.compile([CustomMoleculeItemDTO, ChEMBLMoleculeItemDTO]);

    for (const [dto, expectedFields] of [
      [
        CustomMoleculeItemDTO,
        ['label', 'notes', 'type', 'molFormula', 'name', 'propertiesJson'],
      ],
      [ChEMBLMoleculeItemDTO, ['type']],
    ] as const) {
      const metadata = TypeMetadataStorage.getObjectTypeMetadataByTarget(dto);
      const fields = new Map(metadata?.properties?.map((field) => [field.name, field]));

      for (const fieldName of expectedFields) {
        expect(fields.get(fieldName)?.typeFn()).toBe(String);
      }
    }
  });

  it('serializes and discriminates both variants through the committed schema', async () => {
    const schema = buildSchema(
      readFileSync(join(process.cwd(), 'src/schema.graphql'), 'utf8')
    );
    const result = await graphql({
      schema,
      source: `
        query MoleculeItemVariants {
          myMoleculeItems {
            __typename
            ... on CustomMoleculeItemDTO {
              id
              type
              canonicalSmiles
            }
            ... on ChEMBLMoleculeItemDTO {
              id
              type
              chemblMolregno
            }
          }
        }
      `,
      rootValue: {
        myMoleculeItems: [customItem, chemblItem],
      },
      typeResolver: (value) =>
        resolveMoleculeCollectionItemType(value)?.name,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.myMoleculeItems).toEqual([
      {
        __typename: 'CustomMoleculeItemDTO',
        id: customItem.id,
        type: 'custom',
        canonicalSmiles: 'CCO',
      },
      {
        __typename: 'ChEMBLMoleculeItemDTO',
        id: chemblItem.id,
        type: 'chembl',
        chemblMolregno: '42',
      },
    ]);
    expect(
      schema.getMutationType()?.getFields().updateMoleculeItem.type.toString()
    ).toBe('MoleculeCollectionItemUnion');
  });
});
