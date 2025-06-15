import { GraphQLResolveInfo } from 'graphql';
import * as graphqlFields from 'graphql-fields';

/**
 * Utility class per la gestione delle query GraphQL dinamiche.
 */
export class GraphqlUtils {
    /**
     * Restituisce la mappa dei campi richiesti (root level) dalla query GraphQL.
     * @param info Oggetto GraphQLResolveInfo del resolver.
     * @returns Mappa di campi richiesti.
     */
    static getFieldsMap(info: GraphQLResolveInfo): Record<string, any> {
        return graphqlFields(info) as Record<string, any>
    }

    /**
     * Restituisce la lista dei nomi dei campi "piatti" (scalari, non relazionali).
     * @param fields Mappa di campi restituita da graphql-fields.
     * @returns Array di stringhe con i nomi dei campi scalari.
     */
    static getScalarFields(fields: Record<string, any>): string[] {
        return Object.keys(fields)
            .filter(
                key =>
                    typeof fields[key] === 'object' &&
                    Object.keys(fields[key] as Record<string, any>).length === 0 &&
                    key !== '__typename'
            )
    }


    /**
     * Restituisce la lista dei nomi dei campi relazionali richiesti (con selezioni nidificate).
     * @param fields Mappa di campi restituita da graphql-fields.
     * @returns Array di stringhe con i nomi delle relazioni richieste.
     */
    static getRelationalFields(fields: Record<string, any>): string[] {
        return Object.keys(fields).filter(
            key => typeof fields[key] === 'object' && Object.keys(fields[key] as Record<string, any>).length > 0
        )
    }

    /**
     * Utility ricorsiva: estrae la struttura dei campi richiesti, anche nidificati.
     * Utile per costruire join complesse.
     * @param fields La mappa da graphql-fields.
     * @returns Oggetto ricorsivo dei campi richiesti.
     */
    static getNestedFields(fields: Record<string, any>): Record<string, any> {
        const result = {}
        for (const key in fields) {
            if (
                typeof fields[key] === 'object' &&
                Object.keys(fields[key] as Record<string, any>).length > 0
            ) {
                result[key] = this.getNestedFields(fields[key] as Record<string, any>)
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
