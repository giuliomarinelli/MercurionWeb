import { EntityMetadata } from 'typeorm/metadata/EntityMetadata'
import { GraphQLFieldsMap } from '../../../utils/graphql-utils/graphql-utils'
import { SynthSelectionPlanner } from './synth-selection-planner'

function metadata(relations: Record<string, EntityMetadata>): EntityMetadata {
    return {
        findRelationWithPropertyPath: (property: string) => {
            const relation = relations[property]
            return relation ? relation as never : undefined
        }
    } as unknown as EntityMetadata
}

function relation(propertyPath: string, inverseEntityMetadata: EntityMetadata) {
    return {
        propertyPath,
        inverseEntityMetadata
    } as never
}

describe('SynthSelectionPlanner', () => {
    const molecule = metadata({})
    const poolMolecule = metadata({
        molecule: relation('molecule', molecule),
        stepItems: relation('stepItems', metadata({}))
    })
    const item = metadata({
        poolMolecule: relation('poolMolecule', poolMolecule)
    })
    const step = metadata({
        items: relation('items', item),
        synth: relation('synth', metadata({}))
    })
    const synthesis = metadata({
        steps: relation('steps', step),
        poolMolecules: relation('poolMolecules', poolMolecule),
        poolCollections: relation('poolCollections', metadata({
            collection: relation('collection', metadata({}))
        }))
    })

    it('plans scalar-only selections without joins', () => {
        expect(SynthSelectionPlanner.plan(synthesis, {
            id: {},
            title: {}
        }, 'synthesis')).toEqual([])
    })

    it('plans route, step and molecule-reference projections from their owning metadata', () => {
        const fields: GraphQLFieldsMap = {
            steps: {
                items: {
                    poolMolecule: {
                        molecule: {
                            id: {}
                        }
                    }
                }
            },
            poolMolecules: {
                molecule: {
                    id: {}
                }
            },
            poolCollections: {
                collection: {
                    id: {}
                }
            }
        }

        expect(SynthSelectionPlanner.plan(synthesis, fields, 'synthesis')).toEqual([
            { path: 'synthesis.steps', alias: 'synthesis_steps' },
            { path: 'synthesis_steps.items', alias: 'synthesis_steps_items' },
            { path: 'synthesis_steps_items.poolMolecule', alias: 'synthesis_steps_items_poolMolecule' },
            {
                path: 'synthesis_steps_items_poolMolecule.molecule',
                alias: 'synthesis_steps_items_poolMolecule_molecule'
            },
            { path: 'synthesis.poolMolecules', alias: 'synthesis_poolMolecules' },
            {
                path: 'synthesis_poolMolecules.molecule',
                alias: 'synthesis_poolMolecules_molecule'
            },
            { path: 'synthesis.poolCollections', alias: 'synthesis_poolCollections' },
            {
                path: 'synthesis_poolCollections.collection',
                alias: 'synthesis_poolCollections_collection'
            }
        ])
    })

    it('uses the step root for step-only projections', () => {
        expect(SynthSelectionPlanner.plan(step, {
            items: {
                poolMolecule: {
                    molecule: {
                        id: {}
                    }
                }
            }
        }, 'step')).toEqual([
            { path: 'step.items', alias: 'step_items' },
            { path: 'step_items.poolMolecule', alias: 'step_items_poolMolecule' },
            { path: 'step_items_poolMolecule.molecule', alias: 'step_items_poolMolecule_molecule' }
        ])
    })

    it('rejects an unknown or impossible relation before query execution', () => {
        expect(() => SynthSelectionPlanner.plan(synthesis, {
            moleculeRefs: {
                molecule: {
                    id: {}
                }
            }
        }, 'synthesis')).toThrow('Unsupported Synth relation selection "moleculeRefs"')
    })
})
