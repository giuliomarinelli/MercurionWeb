import { MoleculeCollectionItemJoin } from '../Models/entities/molecule-collection-item-join.entity';

/**
 * Removes MoleculeCollectionItemJoin entries that lost their linked collection.
 * The traversal is defensive (guards against nested relations and circular refs).
 */
export function pruneNullCollectionJoins<T>(payload: T): T {
    if (!payload) {
        return payload;
    }

    const visited = new Set<object>();

    const visit = (node: any): void => {
        if (!node || typeof node !== 'object') {
            return;
        }

        if (visited.has(node)) {
            return;
        }
        visited.add(node);

        if (Array.isArray(node)) {
            node.forEach(visit);
            return;
        }

        if (Array.isArray(node.joins)) {
            node.joins = (node.joins as MoleculeCollectionItemJoin[]).filter(join => join?.collection);
            node.joins.forEach(visit);
        }

        if (Array.isArray(node.items)) {
            node.items = (node.items as MoleculeCollectionItemJoin[]).filter(join => join?.collection);
            node.items.forEach(visit);
        }

        if (node.collection) {
            visit(node.collection);
        }

        if (node.item) {
            visit(node.item);
        }
    };

    visit(payload as any);
    return payload;
}
