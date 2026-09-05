import { readFileSync } from 'fs';
import { resolve } from 'path';
import { buildSchema, GraphQLEnumType, GraphQLObjectType } from 'graphql';

describe('Synth GraphQL contract', () => {
  const schema = buildSchema(readFileSync(resolve(__dirname, '../../schema.graphql'), 'utf8'))

  it('exposes the retained synthesis pool and ordered multistep structure', () => {
    const synthesis = schema.getType('Synthesis') as GraphQLObjectType
    const step = schema.getType('SynthStep') as GraphQLObjectType
    const poolMolecule = schema.getType('SynthesisPoolMolecule') as GraphQLObjectType

    expect(Object.keys(synthesis.getFields())).toEqual(expect.arrayContaining([
      'poolCollections',
      'poolMolecules',
      'steps'
    ]))
    expect(Object.keys(step.getFields())).toEqual(expect.arrayContaining(['order', 'items']))
    expect(poolMolecule.getFields().molecule.type.toString()).toBe('CustomMoleculeItemEntity!')
  })

  it('models reaction content by chemical kind and arrow position', () => {
    const kinds = schema.getType('SynthStepItemKind') as GraphQLEnumType
    const positions = schema.getType('SynthStepItemPosition') as GraphQLEnumType

    expect(kinds.getValues().map(value => value.name)).toEqual([
      'Byproduct',
      'Catalyst',
      'Condition',
      'Other',
      'Product',
      'Reactant',
      'Reagent',
      'Solvent'
    ])
    expect(positions.getValues().map(value => value.name)).toEqual([
      'AfterArrow',
      'BeforeArrow',
      'OnArrow'
    ])
  })

  it('exposes pool and step-item commands and removes the ambiguous legacy molecule-ref contract', () => {
    const mutation = schema.getMutationType()
    const query = schema.getQueryType()

    expect(Object.keys(mutation?.getFields() ?? {})).toEqual(expect.arrayContaining([
      'configureSynthesisPool',
      'addSynthStepItem',
      'updateSynthStepItem',
      'removeSynthStepItem'
    ]))
    expect(query?.getFields().synthStepItems).toBeDefined()
    expect(schema.getType('SynthStepMoleculeRef')).toBeUndefined()
    expect(schema.getType('MoleculeRole')).toBeUndefined()
  })
})
