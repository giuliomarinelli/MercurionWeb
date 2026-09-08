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

function typeText(typeNode) {
    return typeNode ? typeNode.getText() : undefined;
}

function returnTypeText(typeNode) {
    if (!typeNode) return undefined;
    if (ts.isUnionTypeNode(typeNode)) {
        const members = typeNode.types.filter((member) => member.kind !== ts.SyntaxKind.NeverKeyword);
        return members.length === 1 ? returnTypeText(members[0]) : members.map(returnTypeText).join(' | ');
    }
    if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)
        && typeNode.typeName.text === 'Promise' && typeNode.typeArguments?.length === 1) {
        return returnTypeText(typeNode.typeArguments[0]);
    }
    return typeNode.getText();
}

function parameterMetadata(parameter) {
    const decorators = ts.getDecorators(parameter) ?? [];
    const metadata = [];
    for (const decorator of decorators) {
        const name = decoratorName(decorator);
        if (!name || !['Param', 'Query', 'Body'].includes(name)) continue;
        const expression = decorator.expression;
        const argument = ts.isCallExpression(expression) ? expression.arguments[0] : undefined;
        metadata.push({
            source: name.toLowerCase(),
            name: argument && ts.isStringLiteralLike(argument) ? argument.text : undefined,
            type: typeText(parameter.type),
            optional: Boolean(parameter.questionToken || parameter.initializer),
            defaultValue: parameter.initializer ? parameter.initializer.getText() : undefined,
        });
    }
    return metadata;
}

function httpStatusValue(argument) {
    if (!argument) return undefined;
    if (ts.isNumericLiteral(argument)) return Number(argument.text);
    if (ts.isPropertyAccessExpression(argument) && ts.isIdentifier(argument.expression)
        && argument.expression.text === 'HttpStatus') {
        const statuses = {
            OK: 200,
            CREATED: 201,
            ACCEPTED: 202,
            NO_CONTENT: 204,
            BAD_REQUEST: 400,
            UNAUTHORIZED: 401,
            FORBIDDEN: 403,
            NOT_FOUND: 404,
        };
        return statuses[argument.name.text];
    }
    return undefined;
}

function thrownStatuses(member) {
    const statuses = new Set();
    const exceptionStatuses = new Map([
        ['BadRequestException', 400],
        ['UnauthorizedException', 401],
        ['ForbiddenException', 403],
        ['NotFoundException', 404],
    ]);
    function visit(node) {
        if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
            const status = exceptionStatuses.get(node.expression.text);
            if (status) statuses.add(status);
        }
        ts.forEachChild(node, visit);
    }
    if (member.body) visit(member.body);
    return [...statuses].sort((left, right) => left - right);
}

function handlerMetadata(member, classNode) {
    const classDecorators = ts.getDecorators(classNode) ?? [];
    const decorators = [...classDecorators, ...(ts.getDecorators(member) ?? [])];
    const httpCode = decorators.find((decorator) => decoratorName(decorator) === 'HttpCode');
    const httpCodeExpression = httpCode?.expression;
    const httpCodeArgument = httpCodeExpression && ts.isCallExpression(httpCodeExpression)
        ? httpCodeExpression.arguments[0]
        : undefined;
    const guards = decorators.filter((decorator) => decoratorName(decorator) === 'UseGuards')
        .map((decorator) => decorator.expression.getText());
    const scopes = decorators.filter((decorator) => decoratorName(decorator) === 'HasScopes')
        .map((decorator) => decorator.expression.getText());
    return {
        returnType: returnTypeText(member.type),
        successStatus: httpStatusValue(httpCodeArgument),
        public: decorators.some((decorator) => decoratorName(decorator) === 'Public'),
        guards,
        scopes,
        parameters: member.parameters.flatMap(parameterMetadata),
        declaredErrorStatuses: thrownStatuses(member),
    };
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
                        ...handlerMetadata(member, node),
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
