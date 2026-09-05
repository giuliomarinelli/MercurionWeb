import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const root = process.cwd();
const defaultInventoryPath = path.join(root, 'docs', 'architecture', 'rest-route-ownership.json');
const inventoryPath = process.env.REST_ROUTE_OWNERSHIP_INVENTORY_PATH
    ? path.resolve(process.env.REST_ROUTE_OWNERSHIP_INVENTORY_PATH)
    : defaultInventoryPath;
const controllerRoot = path.join(root, 'MercurionWebNode', 'src');
const mainPath = path.join(root, 'MercurionWebNode', 'src', 'main.ts');
const referenceRoots = [
    path.join(root, 'MercurionWebNg', 'src'),
    path.join(root, 'MercurionWebNode', 'src'),
    path.join(root, 'MercurionWebNode', 'test'),
    path.join(root, 'docs'),
    path.join(root, 'docker_sl'),
    path.join(root, 'scripts'),
];
const referenceExtension = /\.(ts|html|md|json|conf|mjs)$/;
const verbs = new Set(['Get', 'Post', 'Put', 'Patch', 'Delete', 'All', 'Head', 'Options']);
const classifications = new Set([
    'active product feature',
    'browser/system API',
    'documented external consumer',
    'removable orphan',
    'test/dev-only endpoint',
    'temporarily disabled endpoint',
    'needs-human-classification',
]);

function compareText(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
}

function relative(file) {
    return path.relative(root, file).split(path.sep).join('/');
}

function walk(directory, predicate) {
    return fs.readdirSync(directory, { withFileTypes: true })
        .sort((left, right) => compareText(left.name, right.name))
        .flatMap((entry) => {
            const entryPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                return walk(entryPath, predicate);
            }
            return predicate(entryPath) ? [entryPath] : [];
        });
}

function decoratorName(decorator) {
    const expression = decorator.expression;
    if (!ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression)) {
        return undefined;
    }
    return expression.expression.text;
}

function decoratorPath(decorator) {
    const expression = decorator.expression;
    const argument = ts.isCallExpression(expression) ? expression.arguments[0] : undefined;
    return argument && ts.isStringLiteralLike(argument) ? argument.text : '';
}

function joinPath(...segments) {
    return `/${segments.join('/').split('/').filter(Boolean).join('/')}`;
}

function readPrefixConfiguration() {
    const source = fs.readFileSync(mainPath, 'utf8');
    const match = source.match(/setGlobalPrefix\(\s*['\"]([^'\"]+)['\"]\s*,\s*\{\s*exclude:\s*\[([^\]]*)\]/s);
    if (!match) {
        throw new Error(`Cannot read setGlobalPrefix configuration from ${relative(mainPath)}.`);
    }
    const prefix = `/${match[1].replace(/^\/+|\/+$/g, '')}`;
    const prefixExceptions = [...match[2].matchAll(/['\"]([^'\"]+)['\"]/g)]
        .map((entry) => joinPath(entry[1]))
        .sort(compareText);
    return { prefix, prefixExceptions };
}

function effectivePath(controllerPath, methodPath, prefixConfiguration) {
    const endpointPath = joinPath(controllerPath, methodPath);
    return prefixConfiguration.prefixExceptions.includes(endpointPath)
        ? endpointPath
        : joinPath(prefixConfiguration.prefix, endpointPath);
}

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
        .filter((file) => file !== inventoryPath)
        .sort((left, right) => compareText(relative(left), relative(right)))
        .map((file) => ({ file, relative: relative(file), lines: fs.readFileSync(file, 'utf8').split(/\r?\n/) }));
}

function routeReferences(route, referenceIndex) {
    const staticPath = route.path.replace(/\/:[^/]+/g, '');
    if (staticPath.length < 2) {
        return [];
    }
    return referenceIndex
        .filter((entry) => entry.relative !== route.controller)
        .flatMap((entry) => entry.lines.flatMap((line, index) => line.includes(staticPath)
            ? [{ file: entry.relative, line: index + 1, kind: referenceKind(entry.relative) }]
            : []))
        .sort((left, right) => compareText(`${left.file}:${String(left.line).padStart(8, '0')}`, `${right.file}:${String(right.line).padStart(8, '0')}`));
}

function routeKey(route) {
    return `${route.method} ${route.path}`;
}

function readRoutes(prefixConfiguration, referenceIndex) {
    return walk(controllerRoot, (file) => file.endsWith('.controller.ts')).flatMap((file) => {
        const sourceText = fs.readFileSync(file, 'utf8');
        const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);
        const routes = [];

        function visit(node) {
            if (!ts.isClassDeclaration(node)) {
                ts.forEachChild(node, visit);
                return;
            }
            const controllerDecorator = ts.getDecorators(node)?.find((decorator) => decoratorName(decorator) === 'Controller');
            if (!controllerDecorator) {
                return;
            }
            const controllerPath = decoratorPath(controllerDecorator);
            for (const member of node.members) {
                if (!ts.isMethodDeclaration(member) || !member.name || !ts.isIdentifier(member.name)) {
                    continue;
                }
                for (const decorator of ts.getDecorators(member) ?? []) {
                    const verb = decoratorName(decorator);
                    if (!verb || !verbs.has(verb)) {
                        continue;
                    }
                    const location = sourceFile.getLineAndCharacterOfPosition(decorator.getStart(sourceFile));
                    routes.push({
                        method: verb.toUpperCase(),
                        path: effectivePath(controllerPath, decoratorPath(decorator), prefixConfiguration),
                        controller: relative(file),
                        handler: member.name.text,
                        line: location.line + 1,
                    });
                }
            }
        }

        visit(sourceFile);
        return routes;
    }).sort((left, right) => compareText(routeKey(left), routeKey(right)) || compareText(left.controller, right.controller) || compareText(left.handler, right.handler));
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
    const routes = readRoutes(prefixConfiguration, referenceIndex).map((route) => ({
        ...route,
        ...ownershipFields(route, existingByKey.get(routeKey(route))),
        references: routeReferences(route, referenceIndex),
    }));
    return {
        schemaVersion: 2,
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
    throw new Error(`REST route ownership inventory is stale. Run "node scripts/check-rest-route-ownership.mjs --write" and review the changes.`);
}

validateOwnership(actual);
console.log(`REST route ownership inventory is current: ${actual.routes.length} routes classified.`);
