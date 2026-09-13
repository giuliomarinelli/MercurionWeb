type RelationNode = Record<string, unknown>;

function isRelationNode(value: unknown): value is RelationNode {
    return typeof value === 'object' && value !== null;
}

function isRelationNodeArray(value: unknown): value is RelationNode[] {
    return Array.isArray(value) && value.every(isRelationNode);
}

/**
 * Removes MoleculeCollectionItemJoin entries that lost their linked collection.
 * The traversal is defensive (guards against nested relations and circular refs).
 */
export function pruneNullCollectionJoins<T>(payload: T): T {
    if (!payload) {
        return payload;
    }

    const visited = new Set<object>();

    const visit = (node: unknown): void => {
        if (!isRelationNode(node)) {
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

        if (isRelationNodeArray(node.joins)) {
            const joins = node.joins.filter(join => Boolean(join.collection));
            node.joins = joins;
            joins.forEach(visit);
        }

        if (isRelationNodeArray(node.items)) {
            const items = node.items.filter(join => Boolean(join.collection));
            node.items = items;
            items.forEach(visit);
        }

        if (node.collection) {
            visit(node.collection);
        }

        if (node.item) {
            visit(node.item);
        }
    };

    visit(payload);
    return payload;
}
