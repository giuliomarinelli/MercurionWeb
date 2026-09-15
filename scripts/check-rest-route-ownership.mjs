import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { compareText, relative, walk, readPrefixConfiguration, readRoutes, routeKey } from './rest-route-extraction.mjs';

const root = process.cwd();
const defaultInventoryPath = path.join(root, 'docs', 'architecture', 'rest-route-ownership.json');
const inventoryPath = process.env.REST_ROUTE_OWNERSHIP_INVENTORY_PATH
    ? path.resolve(process.env.REST_ROUTE_OWNERSHIP_INVENTORY_PATH)
    : defaultInventoryPath;
// Autonomous task recipes and session reports are control-plane metadata. They
// may quote routes while recording validation evidence, but they are not
// product consumers and must never make this application inventory stale.
const referenceRoots = [
    path.join(root, 'MercurionWebNg', 'src'),
    path.join(root, 'MercurionWebNode', 'src'),
    path.join(root, 'MercurionWebNode', 'test'),
    path.join(root, 'docs', 'architecture'),
    path.join(root, 'docker_sl'),
    path.join(root, 'scripts'),
];
const referenceExtension = /\.(ts|html|md|json|conf|mjs)$/;
const derivedReferenceFiles = new Set([
    path.join(root, 'docs', 'architecture', 'rest-contract-compatibility.json'),
]);
const classifications = new Set([
    'active product feature',
    'browser/system API',
    'documented external consumer',
    'removable orphan',
    'test/dev-only endpoint',
    'temporarily disabled endpoint',
    'needs-human-classification',
]);


function referenceKind(file) {
    if (file.startsWith('MercurionWebNg/src/')) return 'angular-source';
    if (file.startsWith('MercurionWebNode/test/')) return 'test';
    if (file.startsWith('MercurionWebNode/src/')) return 'server-source';
    if (file.startsWith('docker_sl/')) return 'nginx';
    if (file.startsWith('docs/')) return 'documentation';
    return 'tooling';
}

function createReferenceIndex() {
    return referenceRoots
        .flatMap((referenceRoot) => walk(referenceRoot, (file) => referenceExtension.test(file)))
        .filter((file) => file !== inventoryPath && !derivedReferenceFiles.has(file))
        .sort((left, right) => compareText(relative(left), relative(right)))
        .map((file) => ({ file, relative: relative(file), lines: fs.readFileSync(file, 'utf8').split(/\r?\n/) }));
}

function routeReferences(route, referenceIndex) {
    const staticPath = route.path.replace(/\/:[^/]+/g, '');
    if (staticPath.length < 2) {
        return [];
    }
    const referencesByFile = new Map(referenceIndex
        .filter((entry) => entry.relative !== route.controller)
        .filter((entry) => entry.lines.some((line) => line.includes(staticPath)))
        .map((entry) => {
            const reference = { file: entry.relative, kind: referenceKind(entry.relative) };
            return [`${reference.file}\u0000${reference.kind}`, reference];
        }));
    return [...referencesByFile.values()]
        .sort((left, right) => compareText(`${left.file}:${left.kind}`, `${right.file}:${right.kind}`));
}

function defaultOwnership(route) {
    return {
        classification: 'needs-human-classification',
        owner: 'Unassigned',
        evidence: [`No approved ownership record exists for ${routeKey(route)}.`],
    };
}

function ownershipFields(route, existing) {
    const ownership = existing
        ? {
            classification: existing.classification,
            owner: existing.owner,
            evidence: existing.evidence,
        }
        : defaultOwnership(route);
    return {
        ...ownership,
        evidence: [...(ownership.evidence ?? [])].sort(compareText),
    };
}

function buildExpectedInventory(actual) {
    const prefixConfiguration = readPrefixConfiguration();
    const referenceIndex = createReferenceIndex();
    const existingByKey = new Map((actual?.routes ?? []).map((route) => [routeKey(route), route]));
    const routes = readRoutes(prefixConfiguration).map((route) => {
        const ownershipRoute = {
            method: route.method,
            path: route.path,
            controller: route.controller,
            handler: route.handler,
        };
        return {
            ...ownershipRoute,
            ...ownershipFields(ownershipRoute, existingByKey.get(routeKey(route))),
            references: routeReferences(ownershipRoute, referenceIndex),
        };
    });
    return {
        schemaVersion: 3,
        generatedBy: 'node scripts/check-rest-route-ownership.mjs --write',
        globalPrefix: prefixConfiguration.prefix,
        prefixExceptions: prefixConfiguration.prefixExceptions,
        routes,
    };
}

function validateOwnership(inventory) {
    const failures = [];
    for (const route of inventory.routes) {
        if (!classifications.has(route.classification)) {
            failures.push(`${routeKey(route)} uses unsupported classification ${JSON.stringify(route.classification)}.`);
        }
        if (!route.owner || !Array.isArray(route.evidence) || route.evidence.length === 0) {
            failures.push(`${routeKey(route)} has no explicit owner and evidence.`);
        }
        if (route.classification === 'needs-human-classification') {
            failures.push(`${routeKey(route)} needs human classification: ${route.evidence.join(' ')}`);
        }
    }
    if (failures.length > 0) {
        throw new Error(`REST route ownership validation failed:\n${failures.join('\n')}`);
    }
}

function summarizeInventoryDrift(actual, expected) {
    const differences = [];
    for (const field of ['schemaVersion', 'generatedBy', 'globalPrefix', 'prefixExceptions']) {
        if (JSON.stringify(actual?.[field]) !== JSON.stringify(expected[field])) {
            differences.push(`- inventory ${field} changed`);
        }
    }

    const actualByKey = new Map((actual?.routes ?? []).map((route) => [routeKey(route), route]));
    const expectedByKey = new Map(expected.routes.map((route) => [routeKey(route), route]));

    for (const [key, expectedRoute] of expectedByKey) {
        const actualRoute = actualByKey.get(key);
        if (!actualRoute) {
            differences.push(`- ${key}: missing route inventory entry`);
            continue;
        }
        for (const field of ['path', 'controller', 'handler', 'classification', 'owner', 'evidence', 'references']) {
            if (JSON.stringify(actualRoute[field]) !== JSON.stringify(expectedRoute[field])) {
                differences.push(`- ${key}: ${field} changed`);
            }
        }
    }

    for (const key of actualByKey.keys()) {
        if (!expectedByKey.has(key)) differences.push(`- ${key}: route no longer exists`);
    }

    const limit = 20;
    const visible = differences.slice(0, limit);
    if (differences.length > limit) visible.push(`- ...and ${differences.length - limit} more difference(s)`);
    return visible.join('\n') || '- serialized inventory differs';
}

const actual = fs.existsSync(inventoryPath) ? JSON.parse(fs.readFileSync(inventoryPath, 'utf8')) : undefined;
const expected = buildExpectedInventory(actual);

if (process.argv.includes('--write')) {
    fs.mkdirSync(path.dirname(inventoryPath), { recursive: true });
    fs.writeFileSync(inventoryPath, `${JSON.stringify(expected, null, 2)}\n`);
    console.log(`Wrote ${relative(inventoryPath)} with ${expected.routes.length} REST routes.`);
    process.exit(0);
}

if (!actual) {
    throw new Error(`Missing ${relative(inventoryPath)}. Run this script with --write and commit the reviewed result.`);
}

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`REST route ownership inventory is stale:\n${summarizeInventoryDrift(actual, expected)}\nRun "node scripts/check-rest-route-ownership.mjs --write" and review the changes.`);
}

validateOwnership(actual);
console.log(`REST route ownership inventory is current: ${actual.routes.length} routes classified.`);
