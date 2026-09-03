import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const inventoryPath = path.join(root, 'docs', 'architecture', 'rest-route-ownership.json');
const controllerRoot = path.join(root, 'MercurionWebNode', 'src');
const referenceRoots = [
    path.join(root, 'MercurionWebNg', 'src'),
    path.join(root, 'MercurionWebNode', 'src'),
    path.join(root, 'MercurionWebNode', 'test'),
    path.join(root, 'docs'),
    path.join(root, 'docker_sl'),
];
const globalPrefix = '/api';
const prefixExceptions = new Set(['/health', '/sitemap.xml', '/robots.txt', '/og/mercurion-og.png']);
const verbs = new Set(['Get', 'Post', 'Put', 'Patch', 'Delete', 'All', 'Head', 'Options']);

function walk(directory, predicate) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
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

function effectivePath(controllerPath, methodPath) {
    const endpointPath = joinPath(controllerPath, methodPath);
    return prefixExceptions.has(endpointPath) ? endpointPath : joinPath(globalPrefix, endpointPath);
}

function ownershipFor(route) {
    if (route.path === '/health') {
        return {
            classification: 'browser/system API',
            owner: 'Operations health monitoring',
            evidence: ['MercurionWebNode/src/main.ts:setGlobalPrefix exclusion', 'docs/autonomous-development/RUNTIME.md: nginx health readiness check'],
        };
    }
    if (['/sitemap.xml', '/robots.txt', '/og/mercurion-og.png'].includes(route.path)) {
        return {
            classification: 'browser/system API',
            owner: 'Public web crawlers and social-preview clients',
            evidence: ['MercurionWebNode/src/main.ts:setGlobalPrefix exclusion', 'MercurionWebNode/src/asset.controller.ts'],
        };
    }
    if (route.path === '/api/test') {
        return {
            classification: 'test/dev-only endpoint',
            owner: 'Nest diagnostic and E2E test support',
            evidence: ['MercurionWebNode/src/test.controller.ts', 'MercurionWebNode/src/test.controller.spec.ts'],
        };
    }
    if (route.path.startsWith('/api/oauth2/') || route.path.startsWith('/api/authentication/sso/')) {
        return {
            classification: 'browser/system API',
            owner: 'OAuth provider redirect and callback flow',
            evidence: ['MercurionWebNode/src/app_modules/oauth2-client/controllers/o-auth2-client.controller.ts', 'MercurionWebNode/src/app_modules/sso/controllers/social-auth.controller.ts'],
        };
    }
    if (route.path.startsWith('/api/admin/')) {
        return {
            classification: 'documented external consumer',
            owner: 'Privileged administration client',
            evidence: ['MercurionWebNode/src/app_modules/admin/controllers/admin.controller.ts', 'MercurionWebNode/src/app_modules/auth/guards/scope.guard.ts'],
        };
    }
    return {
        classification: 'active product feature',
        owner: 'Mercurion Angular application',
        evidence: ['MercurionWebNg/src/app/services/', 'MercurionWebNode/src/app_modules/'],
    };
}

function routeReferences(route) {
    const staticPath = route.path.replace(/\/:[^/]+/g, '');
    if (staticPath.length < 2) {
        return [];
    }
    return referenceRoots.flatMap((referenceRoot) => walk(referenceRoot, (file) => file !== inventoryPath && /\.(ts|html|md|json|conf)$/.test(file))).flatMap((file) => {
        const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
        return lines.flatMap((line, index) => line.includes(staticPath)
            ? [{ file: path.relative(root, file).replaceAll(path.sep, '/'), line: index + 1 }]
            : []);
    });
}

function readRoutes() {
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
                    const route = {
                        method: verb.toUpperCase(),
                        path: effectivePath(controllerPath, decoratorPath(decorator)),
                        controller: path.relative(root, file).replaceAll(path.sep, '/'),
                        handler: member.name.text,
                        line: location.line + 1,
                    };
                    routes.push({ ...route, ...ownershipFor(route), references: routeReferences(route) });
                }
            }
        }

        visit(sourceFile);
        return routes;
    }).sort((left, right) => left.path.localeCompare(right.path) || left.method.localeCompare(right.method));
}

function createInventory() {
    return {
        schemaVersion: 1,
        generatedBy: 'node scripts/check-rest-route-ownership.mjs --write',
        globalPrefix,
        prefixExceptions: [...prefixExceptions].sort(),
        routes: readRoutes(),
    };
}

const expected = createInventory();
if (process.argv.includes('--write')) {
    fs.mkdirSync(path.dirname(inventoryPath), { recursive: true });
    fs.writeFileSync(inventoryPath, `${JSON.stringify(expected, null, 2)}\n`);
    console.log(`Wrote ${path.relative(root, inventoryPath)} with ${expected.routes.length} REST routes.`);
    process.exit(0);
}

if (!fs.existsSync(inventoryPath)) {
    throw new Error(`Missing ${path.relative(root, inventoryPath)}. Run this script with --write and commit the result.`);
}

const actual = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`REST route ownership inventory is stale. Run "node scripts/check-rest-route-ownership.mjs --write" and review the changes.`);
}

const unclassified = actual.routes.filter((route) => !route.classification || !route.owner || route.classification === 'needs-human-classification');
if (unclassified.length > 0) {
    throw new Error(`REST route ownership inventory has unclassified routes: ${unclassified.map((route) => `${route.method} ${route.path}`).join(', ')}`);
}

console.log(`REST route ownership inventory is current: ${actual.routes.length} routes classified.`);
