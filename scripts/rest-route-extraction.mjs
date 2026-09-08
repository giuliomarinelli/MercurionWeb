import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const mainPath = path.join(root, 'MercurionWebNode', 'src', 'main.ts');
const controllerRoot = path.join(root, 'MercurionWebNode', 'src');
const verbs = new Set(['Get', 'Post', 'Put', 'Patch', 'Delete', 'All', 'Head', 'Options']);

export function compareText(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
}

export function relative(file) {
    return path.relative(root, file).split(path.sep).join('/');
}

export function walk(directory, predicate) {
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

export function decoratorName(decorator) {
    const expression = decorator.expression;
    if (!ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression)) {
        return undefined;
    }
    return expression.expression.text;
}

export function decoratorPath(decorator) {
    const expression = decorator.expression;
    const argument = ts.isCallExpression(expression) ? expression.arguments[0] : undefined;
    return argument && ts.isStringLiteralLike(argument) ? argument.text : '';
}

export function joinPath(...segments) {
    return `/${segments.join('/').split('/').filter(Boolean).join('/')}`;
}

export function readPrefixConfiguration() {
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

export function effectivePath(controllerPath, methodPath, prefixConfiguration) {
    const endpointPath = joinPath(controllerPath, methodPath);
    return prefixConfiguration.prefixExceptions.includes(endpointPath)
        ? endpointPath
        : joinPath(prefixConfiguration.prefix, endpointPath);
}

export function readRoutes(prefixConfiguration) {
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
    }).sort((left, right) => compareText(`${left.method} ${left.path}`, `${right.method} ${right.path}`) || compareText(left.controller, right.controller) || compareText(left.handler, right.handler));
}

export function routeKey(route) {
    return `${route.method} ${route.path}`;
}
