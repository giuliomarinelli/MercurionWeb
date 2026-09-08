#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { compareText, relative, walk, readPrefixConfiguration, readRoutes } from './rest-route-extraction.mjs';

const root = process.cwd();
const ngSourceRoot = path.join(root, 'MercurionWebNg', 'src');
const inventoryPath = process.env.REST_CONTRACT_COMPATIBILITY_INVENTORY_PATH
    ? path.resolve(process.env.REST_CONTRACT_COMPATIBILITY_INVENTORY_PATH)
    : path.join(root, 'docs', 'architecture', 'rest-contract-compatibility.json');
const verbs = new Set(['get', 'post', 'put', 'patch', 'delete', 'request']);
const canonicalPrimitiveTypes = new Set(['string', 'number', 'boolean', 'void', 'null', 'undefined', 'unknown', 'object']);

function canonicalTypeNames() {
    const names = new Set();
    for (const file of walk(path.join(root, 'packages', 'rest-contracts', 'src'), (candidate) => candidate.endsWith('.ts'))) {
        const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
        function visit(node) {
            if ((ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) && node.name) names.add(node.name.text);
            ts.forEachChild(node, visit);
        }
        visit(source);
    }
    return names;
}

function canonicalCompatibility(typeValue, names) {
    if (!typeValue || typeValue === 'null') return { applicable: false, compatible: true, type: typeValue ?? null };
    const roots = typeValue.replace(/[<>[\]|&,?]/g, ' ').split(/\s+/).filter(Boolean);
    const unknownNames = roots.filter((name) => /^[A-Za-z_$][\w$]*$/.test(name)
        && !canonicalPrimitiveTypes.has(name)
        && !names.has(name)
        && !['Promise', 'Observable', 'Array', 'ReadonlyArray'].includes(name));
    return { applicable: true, compatible: unknownNames.length === 0 && !/\b(any|never)\b/.test(typeValue), type: typeValue, unknownNames };
}

function sourceFiles() {
    return walk(ngSourceRoot, (file) => file.endsWith('.service.ts'));
}

function typeText(checker, node) {
    if (!node) return undefined;
    try {
        return checker.typeToString(checker.getTypeAtLocation(node), undefined, ts.TypeFormatFlags.NoTruncation);
    } catch {
        return node.getText();
    }
}

function unwrap(node) {
    while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node))) {
        node = node.expression;
    }
    return node;
}

function propertyDeclaration(classNode, name) {
    return classNode.members.find((member) => ts.isPropertyDeclaration(member)
        && ts.isIdentifier(member.name) && member.name.text === name);
}

function localDeclaration(methodNode, name) {
    let result;
    function visit(node) {
        if (result) return;
        if (node !== methodNode && ts.isFunctionLike(node)) return;
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) {
            result = node;
            return;
        }
        ts.forEachChild(node, visit);
    }
    visit(methodNode.body);
    return result;
}

function evaluateExpression(node, context, stack = new Set()) {
    node = unwrap(node);
    if (!node) return undefined;
    if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isTemplateExpression(node)) {
        let value = node.head.text;
        for (const span of node.templateSpans) {
            const expression = unwrap(span.expression);
            value += evaluateExpression(expression, context, stack) ?? `:${expression?.getText() ?? 'expression'}`;
            value += span.literal.text;
        }
        return value;
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        const left = evaluateExpression(node.left, context, stack);
        const right = evaluateExpression(node.right, context, stack);
        return left !== undefined && right !== undefined ? `${left}${right}` : undefined;
    }
    if (ts.isConditionalExpression(node)) {
        const whenTrue = evaluateExpression(node.whenTrue, context, stack);
        const whenFalse = evaluateExpression(node.whenFalse, context, stack);
        return whenTrue === whenFalse ? whenTrue : `${whenTrue ?? ''}${whenFalse ?? ''}`;
    }
    if (ts.isIdentifier(node)) {
        if (stack.has(node.text)) return undefined;
        const declaration = localDeclaration(context.method, node.text) ?? propertyDeclaration(context.classNode, node.text);
        if (!declaration?.initializer) return `:${node.text}`;
        const next = new Set(stack);
        next.add(node.text);
        let value = evaluateExpression(declaration.initializer, context, next);
        if (ts.isVariableDeclaration(declaration) && declaration.parent?.parent) {
            for (const statement of declaration.parent.parent.statements ?? []) {
                if (ts.isExpressionStatement(statement) && ts.isBinaryExpression(statement.expression)
                    && statement.expression.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken
                    && ts.isIdentifier(statement.expression.left) && statement.expression.left.text === node.text) {
                    value = `${value ?? ''}${evaluateExpression(statement.expression.right, context, next) ?? ''}`;
                }
            }
        }
        return value;
    }
    if (ts.isPropertyAccessExpression(node) && ts.isThis(node.expression)) {
        return evaluateExpression(node.name, context, stack);
    }
    return undefined;
}

function genericText(call) {
    return (call.typeArguments ?? call.typeParameters)?.[0]?.getText();
}

function optionMetadata(node, sourceFile) {
    if (!node || !ts.isObjectLiteralExpression(node)) return undefined;
    const metadata = {};
    for (const property of node.properties) {
        if (!ts.isPropertyAssignment(property)) continue;
        const name = property.name.getText(sourceFile).replace(/["']/g, '');
        if (name === 'responseType' || name === 'withCredentials') {
            metadata[name] = property.initializer.getText(sourceFile).replace(/["']/g, '');
        } else if (name === 'headers') {
            metadata.headers = property.initializer.getText(sourceFile);
        }
    }
    return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function queryParameters(url) {
    const query = url.split('?')[1] ?? '';
    return [...query.matchAll(/(?:^|&)([A-Za-z_][\w-]*)(?:=([^&]*))?/g)]
        .map((match) => ({ name: match[1], type: 'string', optional: !match[2] || match[2].includes(':') }))
        .sort((left, right) => compareText(left.name, right.name));
}

function pathOnly(value) {
    return value.split('?')[0].replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
}

function routePathMatches(clientPath, serverPath) {
    const client = pathOnly(clientPath).split('/').filter(Boolean);
    const server = pathOnly(serverPath).split('/').filter(Boolean);
    if (client.length !== server.length) return false;
    return client.every((part, index) => {
        if (part.startsWith(':') && server[index].startsWith(':')) return part.slice(1) === server[index].slice(1);
        return part.startsWith(':') || server[index].startsWith(':') || part === server[index];
    });
}

function extractCalls() {
    const configPath = path.join(root, 'MercurionWebNg', 'tsconfig.app.json');
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
    const program = ts.createProgram(parsed.fileNames, parsed.options);
    const checker = program.getTypeChecker();
    const calls = [];

    for (const file of sourceFiles()) {
        const sourceFile = program.getSourceFile(file) ?? ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
        function visitClass(classNode) {
            if (!classNode.name) return;
            for (const method of classNode.members) {
                if (!ts.isMethodDeclaration(method) || !method.body || !method.name) continue;
                const methodCalls = [];
                function visitMethod(node) {
                    if (node !== method && ts.isFunctionLike(node)) return;
                    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
                        const access = node.expression;
                        const receiver = access.expression;
                        if (ts.isPropertyAccessExpression(receiver) && receiver.name.text === 'http' && ts.isThis(receiver.expression) && verbs.has(access.name.text)) {
                            methodCalls.push({ node, name: access.name.text });
                        }
                    }
                    ts.forEachChild(node, visitMethod);
                }
                visitMethod(method.body);
                methodCalls.sort((left, right) => left.node.getStart(sourceFile) - right.node.getStart(sourceFile));
                methodCalls.forEach(({ node, name }, ordinal) => {
                    const urlIndex = name === 'request' ? 1 : 0;
                    const urlExpression = node.arguments[urlIndex];
                    const url = evaluateExpression(urlExpression, { method, classNode });
                    if (!url) {
                        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                        throw new Error(`Unresolvable Angular REST URL at ${relative(file)}:${line}; add a versioned mapping.`);
                    }
                    const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
                    const responseOption = node.arguments[name === 'request' ? 2 : 1];
                    const responseOptions = optionMetadata(responseOption, sourceFile);
                    calls.push({
                        id: `${relative(file)}#${classNode.name.text}.${method.name.getText(sourceFile)}#${ordinal}`,
                        file: relative(file),
                        className: classNode.name.text,
                        methodName: method.name.getText(sourceFile),
                        ordinal,
                        line: location.line + 1,
                        verb: name === 'request' ? evaluateExpression(node.arguments[0], { method, classNode })?.toUpperCase() : name.toUpperCase(),
                        urlExpression: urlExpression.getText(sourceFile),
                        path: url,
                        pathParameters: [...pathOnly(url).matchAll(/:([A-Za-z_]\w*)/g)].map((match) => ({ name: match[1] })),
                        queryParameters: queryParameters(url),
                        bodyExpression: ['get', 'delete', 'request'].includes(name) ? undefined : node.arguments[1]?.getText(sourceFile),
                        bodyType: ['get', 'delete', 'request'].includes(name) ? undefined : typeText(checker, node.arguments[1]),
                        responseType: genericText(node),
                        responseMode: responseOptions?.responseType ?? (genericText(node) === 'void' ? 'void' : undefined),
                        responseOptions,
                    });
                });
            }
        }
        function visit(node) {
            if (ts.isClassDeclaration(node)) visitClass(node);
            else ts.forEachChild(node, visit);
        }
        visit(sourceFile);
    }
    return calls.sort((left, right) => compareText(left.id, right.id));
}

export function buildInventory() {
    const routes = readRoutes(readPrefixConfiguration());
    const calls = extractCalls();
    const canonicalNames = canonicalTypeNames();
    const entries = calls.map((call) => {
        const candidates = routes.filter((route) => route.method === call.verb && routePathMatches(call.path, route.path));
        const server = candidates.length === 1 ? candidates[0] : undefined;
        const serverQueries = server?.parameters?.filter((parameter) => parameter.source === 'query') ?? [];
        const queryNames = call.queryParameters.map((parameter) => parameter.name);
        const queryCompatible = !server || serverQueries.length === 0 || queryNames.every((name) => serverQueries.some((parameter) => parameter.name === name || !parameter.name));
        const bodyContract = canonicalCompatibility(call.bodyType, canonicalNames);
        const responseContract = canonicalCompatibility(call.responseType, canonicalNames);
        const serverBody = server?.parameters?.find((parameter) => parameter.source === 'body');
        const bodyCompatible = !call.bodyType || call.bodyType === 'null' || Boolean(serverBody);
        const matched = Boolean(server && queryCompatible && bodyCompatible && bodyContract.compatible && responseContract.compatible);
        return {
            id: call.id,
            consumer: {
                file: call.file, class: call.className, method: call.methodName, ordinal: call.ordinal, line: call.line,
                verb: call.verb, path: call.path, pathParameters: call.pathParameters, queryParameters: call.queryParameters,
                body: { expression: call.bodyExpression, type: call.bodyType, contract: bodyContract },
                response: { type: call.responseType, mode: call.responseMode, options: call.responseOptions, contract: responseContract },
            },
            server: server ? {
                controller: server.controller, handler: server.handler, line: server.line, verb: server.method, path: server.path,
                parameters: server.parameters, returnType: server.returnType,
                successStatus: server.successStatus ?? (call.verb === 'POST' ? 201 : 200),
                errorStatuses: {
                    validation: call.bodyType && call.bodyType !== 'null' ? [400] : [],
                    authentication: server.public ? [] : [401, 403],
                },
                authentication: { public: server.public, guards: server.guards, scopes: server.scopes },
            } : null,
            matching: {
                status: matched ? 'matched' : 'unmatched',
                path: Boolean(server), query: queryCompatible, body: bodyCompatible,
                canonicalContract: { request: bodyContract, response: responseContract },
            },
        };
    });
    return {
        schemaVersion: 2,
        generatedBy: 'node scripts/check-rest-compatibility.mjs --write',
        totalClientCalls: entries.length,
        matchedRoutes: entries.filter((entry) => entry.matching.status === 'matched').length,
        entries,
    };
}

export function validateCompatibility(inventory, expected = inventory) {
    const failures = [];
    if (inventory.totalClientCalls !== 58) failures.push(`expected 58 Angular call sites, found ${inventory.totalClientCalls}`);
    const expectedById = new Map((expected.entries ?? []).map((entry) => [entry.id, entry]));
    for (const entry of inventory.entries ?? []) {
        if (entry.matching.status !== 'matched' || !entry.server) {
            failures.push(`${entry.id}: Angular ${entry.consumer.verb} ${entry.consumer.path} -> no compatible Nest handler`);
        }
        const baseline = expectedById.get(entry.id);
        if (!baseline) {
            failures.push(`${entry.id}: Angular consumer has no generated baseline`);
            continue;
        }
        const fields = [
            ['consumer.verb', entry.consumer.verb, baseline.consumer.verb],
            ['consumer.path', entry.consumer.path, baseline.consumer.path],
            ['consumer.pathParameters', entry.consumer.pathParameters, baseline.consumer.pathParameters],
            ['consumer.queryParameters', entry.consumer.queryParameters, baseline.consumer.queryParameters],
            ['consumer.body', entry.consumer.body, baseline.consumer.body],
            ['consumer.response', entry.consumer.response, baseline.consumer.response],
            ['server.verb', entry.server?.verb, baseline.server?.verb],
            ['server.path', entry.server?.path, baseline.server?.path],
            ['server.parameters', entry.server?.parameters, baseline.server?.parameters],
            ['server.successStatus', entry.server?.successStatus, baseline.server?.successStatus],
            ['matching.status', entry.matching.status, baseline.matching.status],
        ];
        for (const [field, actual, expectedValue] of fields) {
            if (JSON.stringify(actual) !== JSON.stringify(expectedValue)) {
                failures.push(`${entry.id}: ${field} mismatch for Angular ${entry.consumer.verb} ${entry.consumer.path} -> ${entry.server?.controller ?? 'no controller'}#${entry.server?.handler ?? 'no handler'}`);
            }
        }
    }
    if ((inventory.entries ?? []).length !== (expected.entries ?? []).length) failures.push('client call inventory length changed');
    if (failures.length) throw new Error(`REST contract compatibility validation failed:\n${failures.join('\n')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const actual = fs.existsSync(inventoryPath) ? JSON.parse(fs.readFileSync(inventoryPath, 'utf8')) : undefined;
    const expected = buildInventory();
    if (process.argv.includes('--write')) {
        fs.writeFileSync(inventoryPath, `${JSON.stringify(expected, null, 2)}\n`);
        console.log(`Wrote ${relative(inventoryPath)} with ${expected.totalClientCalls} client calls, ${expected.matchedRoutes} matched.`);
        process.exit(0);
    }
    if (!actual) throw new Error(`Missing ${relative(inventoryPath)}. Run with --write first.`);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('REST compatibility inventory is stale; regenerate and review it.');
    validateCompatibility(actual, expected);
    console.log(`REST contract compatibility verified: ${actual.totalClientCalls} client calls matched to Nest routes.`);
}
