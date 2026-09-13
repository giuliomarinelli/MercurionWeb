import { GraphQLResolveInfo } from 'graphql';
import * as graphqlFields from 'graphql-fields';

export interface GraphQLFieldsMap {
    [key: string]: GraphQLFieldsMap;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeFields(value: unknown): GraphQLFieldsMap {
    if (!isRecord(value)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [key, decodeFields(child)]),
    );
}

/**
 * Utility class per la gestione delle query GraphQL dinamiche.
 */
export class GraphQLUtils {
    /**
     * Restituisce la mappa dei campi richiesti (root level) dalla query GraphQL.
     * @param info Oggetto GraphQLResolveInfo del resolver.
     * @returns Mappa di campi richiesti.
     */
    static getFieldsMap(info: GraphQLResolveInfo): GraphQLFieldsMap {
        // graphql-fields declares its result as `any`; decode the external
        // payload into the application's recursive field-map contract.
        const raw: unknown = graphqlFields(info)
        return decodeFields(raw)
    }

    /**
     * Restituisce la lista dei nomi dei campi "piatti" (scalari, non relazionali).
     * @param fields Mappa di campi restituita da graphql-fields.
     * @returns Array di stringhe con i nomi dei campi scalari.
     */
    static getScalarFields(fields: GraphQLFieldsMap): string[] {
        return Object.keys(fields)
            .filter(
                key =>
                    typeof fields[key] === 'object' &&
                    Object.keys(fields[key]).length === 0 &&
                    key !== '__typename'
            )
    }


    /**
     * Restituisce la lista dei nomi dei campi relazionali richiesti (con selezioni nidificate).
     * @param fields Mappa di campi restituita da graphql-fields.
     * @returns Array di stringhe con i nomi delle relazioni richieste.
     */
    static getRelationalFields(fields: GraphQLFieldsMap): string[] {
        return Object.keys(fields).filter(
            key => Object.keys(fields[key]).length > 0
        )
    }

    /**
     * Utility ricorsiva: estrae la struttura dei campi richiesti, anche nidificati.
     * Utile per costruire join complesse.
     * @param fields La mappa da graphql-fields.
     * @returns Oggetto ricorsivo dei campi richiesti.
     */
    static getNestedFields(fields: GraphQLFieldsMap): GraphQLFieldsMap {
        const result: GraphQLFieldsMap = {}
        for (const key in fields) {
            if (
                typeof fields[key] === 'object' &&
                Object.keys(fields[key]).length > 0
            ) {
                result[key] = this.getNestedFields(fields[key])
            }
        }
        return result
    }

    /**
     * Esempio di conversione di campi GraphQL in nomi colonne (se non coincidono).
     * Puoi personalizzarlo in base alle tue entità.
     * @param fields Lista di nomi GraphQL.
     * @returns Lista di nomi colonne SQL/ORM.
     */
    static mapGraphqlToDbFields(fields: string[]): string[] {
        // Adatta qui se hai differenze di naming tra GQL e DB
        // Esempio: 'createdAt' -> 'created_at'
        return fields.map(f => f) // default 1:1
    }

    static ensureRequiredFields(fields: string[], required: string[]): string[] {
        return Array.from(new Set([...fields, ...required]))
    }

}
