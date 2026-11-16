import { SelectQueryBuilder } from 'typeorm'
import { EntityMetadata } from 'typeorm/metadata/EntityMetadata'
import { GraphQLFieldsMap } from '../../../utils/graphql-utils/graphql-utils'

export const SYNTH_QUERY_ALIASES = {
    synthesis: 'synthesis',
    step: 'step'
} as const

export type SynthQueryRoot = keyof typeof SYNTH_QUERY_ALIASES

export class SynthSelectionPlanner {
    static applyForSynthesis<T extends object>(
        qb: SelectQueryBuilder<T>,
        metadata: EntityMetadata,
        fields: GraphQLFieldsMap
    ): SelectQueryBuilder<T> {
        return this.apply(qb, metadata, fields, 'synthesis')
    }

    static applyForStep<T extends object>(
        qb: SelectQueryBuilder<T>,
        metadata: EntityMetadata,
        fields: GraphQLFieldsMap
    ): SelectQueryBuilder<T> {
        return this.apply(qb, metadata, fields, 'step')
    }

    private static apply<T extends object>(
        qb: SelectQueryBuilder<T>,
        metadata: EntityMetadata,
        fields: GraphQLFieldsMap,
        root: SynthQueryRoot
    ): SelectQueryBuilder<T> {
        for (const join of this.plan(metadata, fields, SYNTH_QUERY_ALIASES[root])) {
            qb.leftJoinAndSelect(join.path, join.alias)
        }
        return qb
    }

    static plan(
        metadata: EntityMetadata,
        fields: GraphQLFieldsMap,
        rootAlias: string
    ): readonly SynthJoin[] {
        return this.planRelations(metadata, fields, rootAlias, '')
    }

    private static planRelations(
        metadata: EntityMetadata,
        fields: GraphQLFieldsMap,
        parentAlias: string,
        parentPath: string
    ): SynthJoin[] {
        const joins: SynthJoin[] = []

        for (const [property, selection] of Object.entries(fields)) {
            if (property === '__typename' || !selection || Object.keys(selection).length === 0) {
                continue
            }

            const relation = metadata.findRelationWithPropertyPath(property)
            const path = parentPath ? `${parentPath}.${property}` : property
            if (!relation) {
                throw new Error(`Unsupported Synth relation selection "${path}"`)
            }

            const alias = `${parentAlias}_${relation.propertyPath}`
            joins.push({
                path: `${parentAlias}.${relation.propertyPath}`,
                alias
            })
            joins.push(...this.planRelations(relation.inverseEntityMetadata, selection, alias, path))
        }

        return joins
    }
}

export interface SynthJoin {
    readonly path: string
    readonly alias: string
}
