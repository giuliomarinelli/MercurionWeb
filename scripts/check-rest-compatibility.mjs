#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import {
    compareText,
    normalizeSourceText,
    relative,
    walk,
    readPrefixConfiguration,
    readRoutes,
} from './rest-route-extraction.mjs';
import {
    buildCanonicalCatalog,
    contractMetadata,
    createProgramFromConfig,
    shapeAssignable,
    shapesEqual,
} from './rest-contract-type-analysis.mjs';

const root = process.cwd();
const ngSourceRoot = path.join(root, 'MercurionWebNg', 'src');
const inventoryPath = process.env.REST_CONTRACT_COMPATIBILITY_INVENTORY_PATH
    ? path.resolve(process.env.REST_CONTRACT_COMPATIBILITY_INVENTORY_PATH)
    : path.join(root, 'docs', 'architecture', 'rest-contract-compatibility.json');
const verbs = new Set(['get', 'post', 'put', 'patch', 'delete', 'request']);
const canonicalRoot = path.join(root, 'packages', 'rest-contracts');
const nginxPath = path.join(root, 'docker_sl', 'nginx_dev', 'nginx.conf');
const angularConfigPath = path.join(root, 'MercurionWebNg', 'src', 'app', 'app.config.ts');
const interceptorRoot = path.join(root, 'MercurionWebNg', 'src', 'app', 'interceptors');
const validationPipePath = path.join(root, 'MercurionWebNode', 'src', 'config', 'validation-pipe.ts');
const nestMainPath = path.join(root, 'MercurionWebNode', 'src', 'main.ts');
const validationConfiguratorPath = path.join(root, 'MercurionWebNode', 'src', 'bootstrap', 'configurators', 'validation.configurator.ts');

function sourceFiles() {
    return walk(ngSourceRoot, (file) => file.endsWith('.ts')
        && !file.endsWith('.spec.ts')
        && !file.endsWith('.test.ts')
        && !file.endsWith('.d.ts'));
}

function interceptorUrlMutations() {
    const mutations = [];
    for (const file of walk(interceptorRoot, (candidate) => candidate.endsWith('.interceptor.ts'))) {
        const sourceFile = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
        function visit(node) {
            if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
                && node.expression.name.text === 'clone') {
                const options = node.arguments[0];
                if (options && ts.isObjectLiteralExpression(options)) {
                    for (const property of options.properties) {
                        if (!property.name) continue;
                        const name = property.name.getText(sourceFile).replace(/["']/g, '');
                        if (name === 'url' || name === 'urlWithParams') {
                            const line = sourceFile.getLineAndCharacterOfPosition(property.getStart(sourceFile)).line + 1;
                            mutations.push(`${relative(file)}:${line} ${name}`);
                        }
                    }
                }
            }
            if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'HttpRequest') {
                const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                mutations.push(`${relative(file)}:${line} new HttpRequest`);
            }
            ts.forEachChild(node, visit);
        }
        visit(sourceFile);
    }
    return mutations.sort(compareText);
}

function runtimeConfiguration(prefixConfiguration) {
    const angularConfig = fs.readFileSync(angularConfigPath, 'utf8');
    if (!/provideHttpClient\(\s*withInterceptorsFromDi\(\s*\)\s*\)/.test(angularConfig)) {
        throw new Error(`Cannot verify Angular HttpClient/interceptor registration in ${relative(angularConfigPath)}.`);
    }
    const configuredInterceptors = [...angularConfig.matchAll(/provide:\s*HTTP_INTERCEPTORS,\s*useClass:\s*([A-Za-z_$][\w$]*)/g)]
        .map((match) => match[1])
        .sort(compareText);
    const urlMutations = interceptorUrlMutations();
    if (urlMutations.length > 0) {
        throw new Error(`Configured Angular interceptor path mutation requires explicit compatibility support: ${urlMutations.join(', ')}`);
    }

    const nginx = fs.readFileSync(nginxPath, 'utf8');
    const escapedPrefix = prefixConfiguration.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const location = new RegExp(`location\\s+\\^~\\s+${escapedPrefix}/\\s*\\{([\\s\\S]*?)\\n\\s*\\}`).exec(nginx);
    const proxyPass = location?.[1].match(/proxy_pass\s+([^;]+);/)?.[1];
    const expectedProxyPass = `http://host.docker.internal:8099${prefixConfiguration.prefix}/`;
    if (proxyPass !== expectedProxyPass) {
        throw new Error(`Cannot verify nginx ${prefixConfiguration.prefix}/ proxy mapping in ${relative(nginxPath)}; expected ${expectedProxyPass}.`);
    }

    const validationPipe = fs.readFileSync(validationPipePath, 'utf8');
    const validationConfigured = [nestMainPath, validationConfiguratorPath]
        .some((file) => /useGlobalPipes\(\s*createGlobalValidationPipe\(\s*\)\s*\)/.test(fs.readFileSync(file, 'utf8')));
    if (!validationConfigured) {
        throw new Error(`Cannot verify global ValidationPipe installation in ${relative(nestMainPath)} or ${relative(validationConfiguratorPath)}.`);
    }
    const requiredValidationOptions = ['transform', 'whitelist', 'forbidNonWhitelisted', 'forbidUnknownValues'];
    for (const option of requiredValidationOptions) {
        if (!new RegExp(`${option}\\s*:\\s*true`).test(validationPipe)) {
            throw new Error(`Global ValidationPipe must keep ${option}: true in ${relative(validationPipePath)}.`);
        }
    }
    if (!/enableImplicitConversion\s*:\s*true/.test(validationPipe)) {
        throw new Error(`Global ValidationPipe must keep enableImplicitConversion: true in ${relative(validationPipePath)}.`);
    }

    return {
        angular: {
            requestOrigin: 'same-origin',
            httpClientProvider: 'withInterceptorsFromDi',
            configuredInterceptors,
            interceptorUrlMutations: [],
        },
        nginx: {
            configFile: relative(nginxPath),
            location: `${prefixConfiguration.prefix}/`,
            proxyPass,
        },
        nest: {
            globalPrefix: prefixConfiguration.prefix,
            prefixExceptions: prefixConfiguration.prefixExceptions,
            validationPipe: {
                factory: 'createGlobalValidationPipe',
                transform: true,
                whitelist: true,
                forbidNonWhitelisted: true,
                forbidUnknownValues: true,
                enableImplicitConversion: true,
            },
        },
    };
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

function uniqueText(values) {
    return [...new Set(values)].sort(compareText);
}

function isHttpClientExpression(checker, node) {
    const type = checker.getTypeAtLocation(node);
    const symbol = type.aliasSymbol ?? type.symbol;
    return symbol?.name === 'HttpClient'
        || checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation) === 'HttpClient';
}

function plusAssignments(methodNode, name) {
    const assignments = [];
    function visit(node) {
        if (node !== methodNode && ts.isFunctionLike(node)) return;
        if (ts.isBinaryExpression(node)
            && node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken
            && ts.isIdentifier(node.left)
            && node.left.text === name) {
            assignments.push(node);
        }
        ts.forEachChild(node, visit);
    }
    visit(methodNode.body);
    return assignments.sort((left, right) => left.getStart() - right.getStart());
}

function assignmentIsConditional(node, method) {
    for (let current = node.parent; current && current !== method; current = current.parent) {
        if (ts.isIfStatement(current) || ts.isConditionalExpression(current)) return true;
    }
    return false;
}

function evaluateVariants(node, context, stack = new Set()) {
    node = unwrap(node);
    if (!node) return [];
    if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
    if (ts.isTemplateExpression(node)) {
        let values = [node.head.text];
        for (const span of node.templateSpans) {
            const expression = unwrap(span.expression);
            const evaluated = evaluateVariants(expression, context, stack);
            const replacements = evaluated.length > 0 ? evaluated : [`:${expression?.getText() ?? 'expression'}`];
            values = values.flatMap((value) => replacements.map((replacement) => `${value}${replacement}${span.literal.text}`));
        }
        return uniqueText(values);
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        const left = evaluateVariants(node.left, context, stack);
        const right = evaluateVariants(node.right, context, stack);
        return uniqueText(left.flatMap((leftValue) => right.map((rightValue) => `${leftValue}${rightValue}`)));
    }
    if (ts.isConditionalExpression(node)) {
        return uniqueText([
            ...evaluateVariants(node.whenTrue, context, stack),
            ...evaluateVariants(node.whenFalse, context, stack),
        ]);
    }
    if (ts.isIdentifier(node)) {
        if (stack.has(node.text)) return [];
        const declaration = localDeclaration(context.method, node.text) ?? propertyDeclaration(context.classNode, node.text);
        if (!declaration?.initializer) {
            context.placeholderTypes.set(node.text, typeText(context.checker, node) ?? 'unknown');
            return [`:${node.text}`];
        }
        const next = new Set(stack);
        next.add(node.text);
        let values = evaluateVariants(declaration.initializer, context, next);
        if (ts.isVariableDeclaration(declaration)) {
            for (const assignment of plusAssignments(context.method, node.text)) {
                    const additions = evaluateVariants(assignment.right, context, next);
                    const appended = values.flatMap((value) => additions.map((addition) => `${value}${addition}`));
                    values = assignmentIsConditional(assignment, context.method)
                        ? uniqueText([...values, ...appended])
                        : uniqueText(appended);
            }
        }
        return values;
    }
    if (ts.isPropertyAccessExpression(node) && ts.isThis(node.expression)) {
        return evaluateVariants(node.name, context, stack);
    }
    context.placeholderTypes.set(node.getText(), typeText(context.checker, node) ?? 'unknown');
    return [`:${node.getText()}`];
}

function evaluateExpression(node, context) {
    return evaluateVariants(node, context)[0];
}

function genericText(call) {
    return (call.typeArguments ?? call.typeParameters)?.[0]?.getText();
}

function objectProperty(node, name) {
    if (!node || !ts.isObjectLiteralExpression(node)) return undefined;
    const property = node.properties.find((candidate) => ts.isPropertyAssignment(candidate)
        && candidate.name.getText().replace(/["']/g, '') === name);
    return property?.initializer;
}

function methodObservableType(checker, method) {
    if (method.type && ts.isTypeReferenceNode(method.type)
        && ts.isIdentifier(method.type.typeName)
        && method.type.typeName.text === 'Observable'
        && method.type.typeArguments?.length === 1) {
        return checker.getTypeFromTypeNode(method.type.typeArguments[0]);
    }
    return undefined;
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
            metadata.headers = normalizeSourceText(property.initializer.getText(sourceFile));
        }
    }
    return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function sourceTypeForValue(value, placeholderTypes) {
    if (value.startsWith(':')) {
        const type = placeholderTypes.get(value.slice(1)) ?? 'unknown';
        return type === 'true' || type === 'false' ? 'boolean' : type;
    }
    if (value === 'true' || value === 'false') return 'boolean';
    if (/^-?\d+(?:\.\d+)?$/.test(value)) return 'number';
    return 'string';
}

function queryParameters(urlVariants, placeholderTypes) {
    const variants = urlVariants.map((url) => {
        const query = url.split('?')[1] ?? '';
        return new Map([...query.matchAll(/(?:^|&)([A-Za-z_][\w-]*)(?:=([^&]*))?/g)]
            .map((match) => [match[1], match[2] ?? '']));
    });
    const names = uniqueText(variants.flatMap((variant) => [...variant.keys()]));
    return names.map((name) => {
        const values = variants.filter((variant) => variant.has(name)).map((variant) => variant.get(name));
        return {
            name,
            wireType: 'string',
            sourceTypes: uniqueText(values.map((value) => sourceTypeForValue(value, placeholderTypes))),
            optional: values.length !== variants.length,
        };
    });
}

function pathOnly(value) {
    return value.split('?')[0].replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
}

function pathParameters(value, placeholderTypes) {
    return [...pathOnly(value).matchAll(/:([A-Za-z_]\w*)/g)].map((match) => ({
        name: match[1],
        wireType: 'string',
        sourceType: placeholderTypes.get(match[1]) ?? 'unknown',
    }));
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
                        if (verbs.has(access.name.text) && isHttpClientExpression(checker, receiver)) {
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
                    const placeholderTypes = new Map();
                    const evaluationContext = { method, classNode, checker, placeholderTypes };
                    const urlVariants = evaluateVariants(urlExpression, evaluationContext);
                    if (urlVariants.length === 0) {
                        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                        throw new Error(`Unresolvable Angular REST URL at ${relative(file)}:${line}; add a versioned mapping.`);
                    }
                    const paths = uniqueText(urlVariants.map(pathOnly));
                    if (paths.length !== 1) {
                        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                        throw new Error(`Angular REST call has multiple effective paths at ${relative(file)}:${line}: ${paths.join(', ')}`);
                    }
                    const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
                    const optionsIndex = name === 'request' || ['post', 'put', 'patch'].includes(name) ? 2 : 1;
                    const responseOption = node.arguments[optionsIndex];
                    const responseOptions = optionMetadata(responseOption, sourceFile);
                    const bodyNode = name === 'request' || name === 'delete'
                        ? objectProperty(responseOption, 'body')
                        : ['post', 'put', 'patch'].includes(name) ? node.arguments[1] : undefined;
                    const genericNode = node.typeArguments?.[0];
                    const responseType = genericNode
                        ? checker.getTypeFromTypeNode(genericNode)
                        : methodObservableType(checker, method);
                    const responseMode = responseOptions?.responseType
                        ?? (genericText(node) === 'void' ? 'void' : 'json');
                    calls.push({
                        id: `${relative(file)}#${classNode.name.text}.${method.name.getText(sourceFile)}#${ordinal}`,
                        file: relative(file),
                        className: classNode.name.text,
                        methodName: method.name.getText(sourceFile),
                        ordinal,
                        line: location.line + 1,
                        verb: name === 'request' ? evaluateExpression(node.arguments[0], evaluationContext)?.toUpperCase() : name.toUpperCase(),
                        urlExpression: normalizeSourceText(urlExpression.getText(sourceFile)),
                        urlVariants,
                        path: paths[0],
                        pathParameters: pathParameters(paths[0], placeholderTypes),
                        queryParameters: queryParameters(urlVariants, placeholderTypes),
                        bodyExpression: bodyNode ? normalizeSourceText(bodyNode.getText(sourceFile)) : undefined,
                        bodyType: bodyNode ? typeText(checker, bodyNode) : undefined,
                        bodyTypeObject: bodyNode ? checker.getTypeAtLocation(bodyNode) : undefined,
                        responseType: responseType ? checker.typeToString(responseType, undefined, ts.TypeFormatFlags.NoTruncation) : undefined,
                        responseTypeObject: responseType,
                        responseMode,
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
    const sorted = calls.sort((left, right) => compareText(left.id, right.id));
    Object.defineProperty(sorted, 'checker', { value: checker, enumerable: false });
    return sorted;
}

function decoratorName(decorator) {
    const expression = decorator.expression;
    return ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)
        ? expression.expression.text
        : undefined;
}

function propertyValidationMetadata(checker, type, shape) {
    if (shape?.kind !== 'object') return [];
    return checker.getPropertiesOfType(type)
        .filter((property) => Object.hasOwn(shape.properties, property.name))
        .map((property) => {
            const decorators = uniqueText((property.declarations ?? [])
                .flatMap((declaration) => ts.getDecorators(declaration) ?? [])
                .map(decoratorName)
                .filter(Boolean));
            return {
                name: property.name,
                optional: shape.properties[property.name].optional,
                decorators,
            };
        })
        .sort((left, right) => compareText(left.name, right.name));
}

function nestHandlerIndex(context) {
    const handlers = new Map();
    for (const sourceFile of context.program.getSourceFiles()) {
        if (sourceFile.isDeclarationFile || !sourceFile.fileName.endsWith('.controller.ts')) continue;
        function visit(node) {
            if (ts.isMethodDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
                handlers.set(`${relative(sourceFile.fileName)}#${node.name.text}`, node);
            }
            ts.forEachChild(node, visit);
        }
        visit(sourceFile);
    }
    return handlers;
}

function awaitedReturnType(checker, method) {
    const signature = checker.getSignatureFromDeclaration(method);
    if (!signature) return undefined;
    const returnType = checker.getReturnTypeOfSignature(signature);
    return checker.getAwaitedType(returnType) ?? returnType;
}

function nestTypeMetadata(route, context, handlers, catalog) {
    const method = handlers.get(`${route.controller}#${route.handler}`);
    if (!method) throw new Error(`Cannot resolve Nest handler type metadata for ${route.controller}#${route.handler}.`);
    const parameters = [];
    for (const parameter of method.parameters) {
        const type = context.checker.getTypeAtLocation(parameter);
        for (const decorator of ts.getDecorators(parameter) ?? []) {
            const source = decoratorName(decorator)?.toLowerCase();
            if (!['param', 'query', 'body'].includes(source)) continue;
            const expression = decorator.expression;
            const argument = ts.isCallExpression(expression) ? expression.arguments[0] : undefined;
            const contract = contractMetadata(context.checker, type, catalog);
            parameters.push({
                source,
                name: argument && ts.isStringLiteralLike(argument) ? argument.text : undefined,
                displayType: context.checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation),
                shape: contract.shape,
                shapeHash: contract.shapeHash,
                canonicalNames: contract.names,
                directCanonicalNames: contract.directNames,
                structuralCanonicalNames: contract.structuralNames,
                applicable: contract.applicable,
                canonical: contract.compatible,
                validation: source === 'body'
                    ? propertyValidationMetadata(context.checker, type, contract.shape)
                    : undefined,
            });
        }
    }
    const returnType = awaitedReturnType(context.checker, method);
    const response = contractMetadata(context.checker, returnType, catalog);
    return {
        parameters,
        response: {
            displayType: returnType ? context.checker.typeToString(returnType, undefined, ts.TypeFormatFlags.NoTruncation) : undefined,
            shape: response.shape,
            shapeHash: response.shapeHash,
            canonicalNames: response.names,
            directCanonicalNames: response.directNames,
            structuralCanonicalNames: response.structuralNames,
            applicable: response.applicable,
            canonical: response.compatible,
        },
    };
}

function withoutShape(contract) {
    if (!contract) return contract;
    if (Object.hasOwn(contract, 'displayType')) {
        return {
            displayType: contract.displayType,
            shapeHash: contract.shapeHash,
            canonicalNames: contract.directCanonicalNames ?? contract.canonicalNames ?? [],
            applicable: contract.applicable,
            canonical: contract.canonical,
        };
    }
    return {
        applicable: contract.applicable,
        compatible: contract.compatible,
        canonicalNames: contract.directNames ?? contract.names ?? [],
        shapeHash: contract.shapeHash,
    };
}

function serverParameterType(parameter) {
    if (parameter.type) return parameter.type;
    if (parameter.defaultValue === 'true' || parameter.defaultValue === 'false') return 'boolean';
    if (parameter.defaultValue && /^-?\d+(?:\.\d+)?$/.test(parameter.defaultValue)) return 'number';
    if (parameter.defaultValue?.startsWith("'") || parameter.defaultValue?.startsWith('"')) return 'string';
    return 'unknown';
}

function queryTypeCompatible(client, server) {
    const serverType = serverParameterType(server);
    if (serverType === 'unknown' || serverType === 'string') return true;
    return client.sourceTypes.every((type) => {
        if (type === serverType || type.endsWith(`.${serverType}`)) return true;
        if (serverType === 'number') return ['number', 'string'].includes(type);
        if (serverType === 'boolean') return ['boolean', 'string'].includes(type);
        return /^[A-Za-z_$][\w$]*(?:\s*\|\s*[A-Za-z_$][\w$]*)*$/.test(type);
    });
}

function queryCompatibility(clientParameters, serverParameters) {
    const serverByName = new Map(serverParameters.map((parameter) => [parameter.name, parameter]));
    const clientByName = new Map(clientParameters.map((parameter) => [parameter.name, parameter]));
    const failures = [];
    for (const client of clientParameters) {
        const server = serverByName.get(client.name);
        if (!server) failures.push(`client query ${client.name} is not accepted by Nest`);
        else if (!queryTypeCompatible(client, server)) failures.push(`query ${client.name} type ${client.sourceTypes.join('|')} is incompatible with ${serverParameterType(server)}`);
    }
    for (const server of serverParameters) {
        const client = clientByName.get(server.name);
        if (!server.optional && (!client || client.optional)) failures.push(`required Nest query ${server.name} is not always sent by Angular`);
    }
    return { compatible: failures.length === 0, failures };
}

function pathCompatibility(clientParameters, serverParameters) {
    const failures = [];
    const clientByName = new Map(clientParameters.map((parameter) => [parameter.name, parameter]));
    const serverByName = new Map(serverParameters.map((parameter) => [parameter.name, parameter]));
    for (const name of new Set([...clientByName.keys(), ...serverByName.keys()])) {
        if (!clientByName.has(name)) failures.push(`Nest path parameter ${name} is missing from Angular`);
        if (!serverByName.has(name)) failures.push(`Angular path parameter ${name} is missing from Nest`);
    }
    return { compatible: failures.length === 0, failures };
}

function commonCanonicalNames(left, right) {
    const leftNames = left.directNames ?? left.directCanonicalNames ?? [];
    const rightNames = new Set(right.directNames ?? right.directCanonicalNames ?? []);
    return leftNames.filter((name) => rightNames.has(name));
}

function contractComparison(client, server, { allowAbsent = false, request = false } = {}) {
    if (!client && !server) return { compatible: true, canonical: true, canonicalNames: [], clientShapeHash: null, serverShapeHash: null };
    if (!client || !server) return { compatible: allowAbsent, canonical: false, canonicalNames: [], clientShapeHash: client?.shapeHash ?? null, serverShapeHash: server?.shapeHash ?? null };
    const compatible = request
        ? shapeAssignable(client.shape, server.shape) && shapeAssignable(server.shape, client.shape)
        : shapesEqual(client.shape, server.shape);
    const canonicalNames = commonCanonicalNames(client, server);
    const canonical = !client.applicable || (client.compatible && server.canonical !== false && canonicalNames.length > 0);
    return {
        compatible,
        canonical,
        canonicalNames,
        clientShapeHash: client.shapeHash,
        serverShapeHash: server.shapeHash,
    };
}

function validationCompatibility(serverBody) {
    if (!serverBody) return { compatible: true, policy: 'not-applicable', properties: [], failures: [] };
    const transformations = new Set(['Exclude', 'Expose', 'Transform', 'Type']);
    const failures = [];
    for (const property of serverBody.validation ?? []) {
        const validators = property.decorators.filter((name) => !transformations.has(name));
        if (validators.length === 0) failures.push(`body property ${property.name} has no runtime validator`);
        if (property.optional && !validators.some((name) => name === 'IsOptional' || name === 'ValidateIf')) {
            failures.push(`optional body property ${property.name} has no IsOptional/ValidateIf guard`);
        }
    }
    return {
        compatible: failures.length === 0,
        policy: 'global ValidationPipe plus DTO property decorators',
        properties: serverBody.validation ?? [],
        failures,
    };
}

export function buildInventory() {
    const prefixConfiguration = readPrefixConfiguration();
    const runtime = runtimeConfiguration(prefixConfiguration);
    const routes = readRoutes(prefixConfiguration);
    const calls = extractCalls();
    for (const call of calls) {
        if (!call.path.startsWith(`${prefixConfiguration.prefix}/`)) {
            throw new Error(`${call.id}: Angular REST path ${call.path} does not use the effective ${prefixConfiguration.prefix}/ nginx/Nest prefix.`);
        }
    }
    const catalog = buildCanonicalCatalog(path.join(canonicalRoot, 'tsconfig.json'), canonicalRoot);
    const nestContext = createProgramFromConfig(path.join(root, 'MercurionWebNode', 'tsconfig.json'));
    const handlers = nestHandlerIndex(nestContext);
    const entries = calls.map((call) => {
        const candidates = routes.filter((route) => route.method === call.verb && routePathMatches(call.path, route.path));
        const server = candidates.length === 1 ? candidates[0] : undefined;
        const serverQueries = server?.parameters?.filter((parameter) => parameter.source === 'query') ?? [];
        const serverPathParameters = server?.parameters?.filter((parameter) => parameter.source === 'param') ?? [];
        const query = queryCompatibility(call.queryParameters, serverQueries);
        const pathParametersMatch = pathCompatibility(call.pathParameters, serverPathParameters);
        const bodyContract = contractMetadata(calls.checker, call.bodyTypeObject, catalog);
        const responseContract = contractMetadata(calls.checker, call.responseTypeObject, catalog);
        const serverBody = server?.parameters?.find((parameter) => parameter.source === 'body');
        const nestTypes = server ? nestTypeMetadata(server, nestContext, handlers, catalog) : undefined;
        const nestBody = nestTypes?.parameters.find((parameter) => parameter.source === 'body');
        const hasClientBody = Boolean(call.bodyTypeObject && call.bodyType !== 'null' && call.bodyType !== 'undefined');
        const request = hasClientBody
            ? contractComparison(bodyContract, nestBody, { request: true })
            : contractComparison(undefined, serverBody ? nestBody : undefined);
        const response = contractComparison(responseContract, nestTypes?.response);
        const validation = validationCompatibility(nestBody);
        const matched = Boolean(server
            && query.compatible
            && pathParametersMatch.compatible
            && request.compatible
            && request.canonical
            && validation.compatible
            && response.compatible
            && response.canonical);
        return {
            id: call.id,
            consumer: {
                file: call.file, class: call.className, method: call.methodName, ordinal: call.ordinal,
                verb: call.verb, path: call.path, urlVariants: call.urlVariants,
                pathParameters: call.pathParameters, queryParameters: call.queryParameters,
                body: { expression: call.bodyExpression, type: call.bodyType, contract: withoutShape(bodyContract) },
                response: { type: call.responseType, mode: call.responseMode, options: call.responseOptions, contract: withoutShape(responseContract) },
            },
            server: server ? {
                controller: server.controller, handler: server.handler, verb: server.method, path: server.path,
                parameters: server.parameters, returnType: server.returnType,
                successStatus: server.successStatus ?? (server.method === 'POST' ? 201 : 200),
                errorStatuses: {
                    validation: hasClientBody || serverQueries.length > 0 || serverPathParameters.length > 0 ? [400] : [],
                    authentication: server.public ? [] : [401],
                    authorization: server.scopes.length > 0 ? [403] : [],
                    declared: server.declaredErrorStatuses,
                },
                authentication: { public: server.public, guards: server.guards, scopes: server.scopes },
                bodyContract: withoutShape(nestBody),
                responseContract: withoutShape(nestTypes.response),
            } : null,
            matching: {
                status: matched ? 'matched' : 'unmatched',
                path: { compatible: Boolean(server), failures: server ? [] : ['no unique Nest route'] },
                pathParameters: pathParametersMatch,
                query,
                request,
                validation,
                response,
            },
        };
    });
    return {
        schemaVersion: 4,
        generatedBy: 'node scripts/check-rest-compatibility.mjs --write',
        runtime,
        totalClientCalls: entries.length,
        matchedClientCalls: entries.filter((entry) => entry.matching.status === 'matched').length,
        uniqueNestRoutes: new Set(entries.filter((entry) => entry.server).map((entry) => `${entry.server.verb} ${entry.server.path}`)).size,
        entries,
    };
}

export function validateCompatibility(inventory, expected = inventory) {
    const failures = [];
    if (inventory.schemaVersion !== 4) failures.push(`expected schemaVersion 4, found ${inventory.schemaVersion}`);
    if (JSON.stringify(inventory.runtime) !== JSON.stringify(expected.runtime)) failures.push('effective Angular/nginx/Nest runtime configuration drifted');
    if (inventory.runtime?.angular?.requestOrigin !== 'same-origin') failures.push('Angular REST requests must remain same-origin');
    if (inventory.runtime?.angular?.interceptorUrlMutations?.length !== 0) failures.push('Angular interceptors must not rewrite REST paths without explicit compatibility support');
    if (inventory.runtime?.nginx?.location !== `${inventory.runtime?.nest?.globalPrefix}/`) failures.push('nginx API location and Nest global prefix differ');
    if (inventory.runtime?.nest?.validationPipe?.factory !== 'createGlobalValidationPipe') failures.push('global Nest ValidationPipe factory is not represented');
    if (inventory.totalClientCalls !== 59) failures.push(`expected 59 Angular call sites, found ${inventory.totalClientCalls}`);
    if (inventory.matchedClientCalls !== inventory.totalClientCalls) failures.push(`expected every Angular call site to match, found ${inventory.matchedClientCalls}/${inventory.totalClientCalls}`);
    if ((inventory.entries ?? []).length !== inventory.totalClientCalls) failures.push(`entry count ${inventory.entries?.length ?? 0} differs from totalClientCalls ${inventory.totalClientCalls}`);
    const ids = (inventory.entries ?? []).map((entry) => entry.id);
    if (new Set(ids).size !== ids.length) failures.push('client call inventory contains duplicate stable ids');
    const expectedById = new Map((expected.entries ?? []).map((entry) => [entry.id, entry]));
    for (const entry of inventory.entries ?? []) {
        const endpoint = `Angular ${entry.consumer.verb} ${entry.consumer.path} -> ${entry.server?.controller ?? 'no controller'}#${entry.server?.handler ?? 'no handler'}`;
        if (entry.matching.status !== 'matched' || !entry.server) {
            const reasons = Object.entries(entry.matching)
                .filter(([, value]) => value && typeof value === 'object' && value.compatible === false)
                .flatMap(([name, value]) => value.failures?.map((failure) => `${name}: ${failure}`) ?? [name]);
            failures.push(`${entry.id}: ${endpoint} is incompatible${reasons.length ? ` (${reasons.join('; ')})` : ''}`);
        }
        for (const component of ['path', 'pathParameters', 'query', 'request', 'validation', 'response']) {
            if (!entry.matching[component]?.compatible) failures.push(`${entry.id}: ${component} mismatch for ${endpoint}`);
        }
        for (const component of ['request', 'response']) {
            if (!entry.matching[component]?.canonical) failures.push(`${entry.id}: ${component} does not derive from @mercurion/rest-contracts for ${endpoint}`);
        }
        if (!Number.isInteger(entry.server?.successStatus)) failures.push(`${entry.id}: unresolved success status for ${endpoint}`);
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
            ['server.errorStatuses', entry.server?.errorStatuses, baseline.server?.errorStatuses],
            ['server.authentication', entry.server?.authentication, baseline.server?.authentication],
            ['server.bodyContract', entry.server?.bodyContract, baseline.server?.bodyContract],
            ['server.responseContract', entry.server?.responseContract, baseline.server?.responseContract],
            ['matching', entry.matching, baseline.matching],
        ];
        for (const [field, actual, expectedValue] of fields) {
            if (JSON.stringify(actual) !== JSON.stringify(expectedValue)) {
                failures.push(`${entry.id}: ${field} mismatch for Angular ${entry.consumer.verb} ${entry.consumer.path} -> ${entry.server?.controller ?? 'no controller'}#${entry.server?.handler ?? 'no handler'}`);
            }
        }
    }
    for (const id of expectedById.keys()) {
        if (!ids.includes(id)) failures.push(`${id}: expected Angular call site is missing`);
    }
    if ((inventory.entries ?? []).length !== (expected.entries ?? []).length) failures.push('client call inventory length changed');
    if (failures.length) throw new Error(`REST contract compatibility validation failed:\n${failures.join('\n')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const actual = fs.existsSync(inventoryPath) ? JSON.parse(fs.readFileSync(inventoryPath, 'utf8')) : undefined;
    const expected = buildInventory();
    if (process.argv.includes('--write')) {
        fs.writeFileSync(inventoryPath, `${JSON.stringify(expected, null, 2)}\n`);
        console.log(`Wrote ${relative(inventoryPath)} with ${expected.totalClientCalls} client calls, ${expected.matchedClientCalls} matched to ${expected.uniqueNestRoutes} Nest routes.`);
        process.exit(0);
    }
    if (!actual) throw new Error(`Missing ${relative(inventoryPath)}. Run with --write first.`);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('REST compatibility inventory is stale; regenerate and review it.');
    validateCompatibility(actual, expected);
    console.log(`REST contract compatibility verified: ${actual.totalClientCalls} client calls matched to Nest routes.`);
}
