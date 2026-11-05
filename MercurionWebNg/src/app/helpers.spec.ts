import { Helpers } from './helpers';
import type { CustomMoleculeItemEntity } from './Models/graphql/molecule-collection/molecule-collection.types'

describe('Helpers', () => {
  it('should create an instance', () => {
    expect(new Helpers()).toBeTruthy();
  });

  const customMolecule = (propertiesJson: string | null): CustomMoleculeItemEntity => ({
    id: '25000000-0000-4000-8000-000000000104',
    type: 'custom',
    name: 'Acido acetilsalicilico',
    canonicalSmiles: 'CC(=O)Oc1ccccc1C(=O)O',
    molFormula: 'C9H8O4',
    label: null,
    notes: null,
    propertiesJson,
    joins: [],
    createdAt: '1793354400000',
    updatedAt: '1793354400000',
    touchedAt: '1793354400000'
  })

  for (const missing of [null, '', '{}', 'null', '{broken', '{"mwFreebase":null}']) {
    it(`does not invent a zero molecular weight for missing properties: ${missing}`, () => {
      const card = Helpers.moleculeClientToCardConverter(customMolecule(missing))
      expect(card.mwFreebase).toBeUndefined()
    })
  }

  for (const value of [0, 180.16]) {
    it(`preserves a supplied molecular weight of ${value}`, () => {
      const card = Helpers.moleculeClientToCardConverter(customMolecule(JSON.stringify({ mwFreebase: value })))
      expect(card.mwFreebase).toBe(value)
    })
  }

});
