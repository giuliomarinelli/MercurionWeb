import { SelectQueryBuilder } from 'typeorm'

export type GraphQLFieldsMap = {
    [key: string]: GraphQLFieldsMap | object
}


export class TypeOrmUtils {
    /**
     * Aggiunge leftJoinAndSelect ricorsivi su tutte le relazioni richieste dalla struttura fields di graphql-fields.
     * @param qb SelectQueryBuilder<T>
     * @param base Alias di partenza (es: 'labNotebook')
     * @param fields Albero dei campi richiesti (output di graphql-fields)
     * @param prefix Usato per relazioni annidate (non serve toccare)
     * @returns qb con tutte le join aggiunte
     */
    static addJoins<T extends object>(
        qb: SelectQueryBuilder<T>,
        base: string,
        fields: GraphQLFieldsMap,
        prefix = ''
    ): SelectQueryBuilder<T> {
        Object.entries(fields).forEach(([key, value]) => {
            if (key === '__typename') return
            const path = prefix ? `${prefix}.${key}` : key
            if (typeof value === 'object' && value !== null && Object.keys(value).length > 0) {
                const alias = path.replace(/\./g, '_')
                qb.leftJoinAndSelect(`${base}.${path}`, alias)
                this.addJoins(qb, alias, value as GraphQLFieldsMap, '')
            }
        })
        return qb
    }
    static filterJoinsForEntity(fields: Record<string, any>, validJoins: string[]): Record<string, any> {
        const filtered: Record<string, any> = {};
        for (const key in fields) {
            if (validJoins.includes(key) && typeof fields[key] === 'object' && fields[key] !== null) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                filtered[key] = fields[key];
            }
        }
        return filtered;
    }
    
}
