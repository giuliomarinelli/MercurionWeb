import path from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';

function compareText(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
}

const primitiveFlags = [
    [ts.TypeFlags.String, 'string'],
    [ts.TypeFlags.Number, 'number'],
    [ts.TypeFlags.Boolean, 'boolean'],
    [ts.TypeFlags.Void, 'void'],
    [ts.TypeFlags.Undefined, 'undefined'],
    [ts.TypeFlags.Null, 'null'],
    [ts.TypeFlags.Unknown, 'unknown'],
    [ts.TypeFlags.Never, 'never'],
];

function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

export function stableJson(value) {
    return JSON.stringify(stableValue(value));
}

export function createProgramFromConfig(configPath) {
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    if (configFile.error) {
        throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
    }
    const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
    if (parsed.errors.length > 0) {
        throw new Error(parsed.errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'));
    }
    const program = ts.createProgram(parsed.fileNames, parsed.options);
    return { program, checker: program.getTypeChecker() };
}

function decoratorName(decorator) {
    const expression = decorator.expression;
    return ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)
        ? expression.expression.text
        : undefined;
}

function excludedProperties(type) {
    const excluded = new Set();
    for (const declaration of type.aliasSymbol?.declarations ?? type.symbol?.declarations ?? []) {
        if (!ts.isClassDeclaration(declaration)) continue;
        for (const member of declaration.members) {
            if (!member.name || (!ts.isIdentifier(member.name) && !ts.isStringLiteralLike(member.name))) continue;
            if ((ts.getDecorators(member) ?? []).some((decorator) => decoratorName(decorator) === 'Exclude')) {
                excluded.add(member.name.text);
            }
        }
    }
    return excluded;
}

function literalShape(type) {
    if (type.isStringLiteral()) return { kind: 'literal', value: type.value };
    if (type.isNumberLiteral()) return { kind: 'literal', value: type.value };
    if (type.flags & ts.TypeFlags.BooleanLiteral) {
        return { kind: 'literal', value: type.intrinsicName === 'true' };
    }
    if (type.flags & ts.TypeFlags.TemplateLiteral) return { kind: 'primitive', name: 'string' };
    return undefined;
}

export function typeShape(checker, inputType, state = { active: new Set(), depth: 0 }) {
    const literal = literalShape(inputType);
    if (literal) return literal;
    if (inputType.flags & ts.TypeFlags.Any) return { kind: 'unsafe', name: 'any' };
    for (const [flag, name] of primitiveFlags) {
        if (inputType.flags & flag) return { kind: 'primitive', name };
    }
    const type = checker.getApparentType(inputType);
    if (type.isUnion()) {
        const members = type.types.map((member) => typeShape(checker, member, state));
        const unique = [...new Map(members.map((member) => [stableJson(member), member])).values()]
            .sort((left, right) => compareText(stableJson(left), stableJson(right)));
        return unique.length === 1 ? unique[0] : { kind: 'union', members: unique };
    }
    if (type.isIntersection()) {
        const properties = checker.getPropertiesOfType(type);
        if (properties.length === 0) {
            return { kind: 'intersection', members: type.types.map((member) => typeShape(checker, member, state)) };
        }
    }
    if (checker.isTupleType(type)) {
        return { kind: 'tuple', members: checker.getTypeArguments(type).map((member) => typeShape(checker, member, state)) };
    }
    if (checker.isArrayType(type)) {
        const [element] = checker.getTypeArguments(type);
        return { kind: 'array', element: typeShape(checker, element, state) };
    }
    const symbol = type.aliasSymbol ?? type.symbol;
    const identity = symbol ? checker.getFullyQualifiedName(symbol) : checker.typeToString(type);
    if (state.depth > 10 || state.active.has(identity)) return { kind: 'recursive', name: symbol?.name ?? identity };
    const nextState = { active: new Set(state.active).add(identity), depth: state.depth + 1 };
    const omitted = excludedProperties(type);
    const properties = {};
    for (const property of checker.getPropertiesOfType(type).sort((left, right) => compareText(left.name, right.name))) {
        if (omitted.has(property.name)) continue;
        const declaration = property.valueDeclaration ?? property.declarations?.[0];
        if (declaration && (ts.isMethodDeclaration(declaration) || ts.isMethodSignature(declaration) || ts.isFunctionDeclaration(declaration))) continue;
        const propertyType = checker.getTypeOfSymbolAtLocation(property, declaration ?? symbol?.valueDeclaration ?? type.symbol?.valueDeclaration);
        if (propertyType.getCallSignatures().length > 0 && checker.getPropertiesOfType(propertyType).length === 0) continue;
        properties[property.name] = {
            optional: Boolean(property.flags & ts.SymbolFlags.Optional),
            type: typeShape(checker, propertyType, nextState),
        };
    }
    const stringIndex = checker.getIndexTypeOfType(type, ts.IndexKind.String);
    const numberIndex = checker.getIndexTypeOfType(type, ts.IndexKind.Number);
    if (Object.keys(properties).length === 0 && !stringIndex && !numberIndex) {
        return { kind: 'opaque', name: symbol?.name ?? checker.typeToString(type) };
    }
    return {
        kind: 'object',
        properties,
        ...(stringIndex ? { stringIndex: typeShape(checker, stringIndex, nextState) } : {}),
        ...(numberIndex ? { numberIndex: typeShape(checker, numberIndex, nextState) } : {}),
    };
}

export function shapeHash(shape) {
    return createHash('sha256').update(stableJson(shape)).digest('hex');
}

export function shapesEqual(left, right) {
    return stableJson(left) === stableJson(right);
}

function memberAssignable(source, target) {
    if (target.kind === 'primitive' && target.name === 'unknown') return true;
    if (source.kind === 'literal' && target.kind === 'primitive') return typeof source.value === target.name;
    if (source.kind !== target.kind) return false;
    if (source.kind === 'primitive' || source.kind === 'unsafe' || source.kind === 'opaque' || source.kind === 'recursive') {
        return source.name === target.name;
    }
    if (source.kind === 'literal') return source.value === target.value;
    if (source.kind === 'array') return shapeAssignable(source.element, target.element);
    if (source.kind === 'tuple') {
        return source.members.length === target.members.length
            && source.members.every((member, index) => shapeAssignable(member, target.members[index]));
    }
    if (source.kind === 'object') {
        for (const [name, targetProperty] of Object.entries(target.properties)) {
            const sourceProperty = source.properties[name];
            if (!sourceProperty) {
                if (targetProperty.optional) continue;
                return false;
            }
            if (!targetProperty.optional && sourceProperty.optional) return false;
            if (!shapeAssignable(sourceProperty.type, targetProperty.type)) return false;
        }
        if (target.stringIndex && (!source.stringIndex || !shapeAssignable(source.stringIndex, target.stringIndex))) return false;
        if (target.numberIndex && (!source.numberIndex || !shapeAssignable(source.numberIndex, target.numberIndex))) return false;
        return true;
    }
    if (source.kind === 'intersection') {
        return source.members.every((member) => target.members.some((candidate) => shapeAssignable(member, candidate)));
    }
    return false;
}

export function shapeAssignable(source, target) {
    if (source.kind === 'union') return source.members.every((member) => shapeAssignable(member, target));
    if (target.kind === 'union') return target.members.some((member) => shapeAssignable(source, member));
    return memberAssignable(source, target);
}

function canonicalDeclaration(declaration, root) {
    const file = declaration.getSourceFile().fileName.replaceAll('\\', '/').toLowerCase();
    const canonicalRoot = root.replaceAll('\\', '/').toLowerCase();
    return file.startsWith(canonicalRoot) || file.includes('/node_modules/@mercurion/rest-contracts/');
}

function directCanonicalNames(checker, type, canonicalRoot, result = new Set(), visited = new Set()) {
    if (visited.has(type)) return result;
    visited.add(type);
    for (const symbol of [type.aliasSymbol, type.symbol]) {
        if (!symbol) continue;
        if ((symbol.declarations ?? []).some((declaration) => canonicalDeclaration(declaration, canonicalRoot))) {
            result.add(symbol.name);
        }
    }
    if (type.isUnionOrIntersection()) {
        for (const member of type.types) directCanonicalNames(checker, member, canonicalRoot, result, visited);
    }
    if (checker.isArrayType(type) || checker.isTupleType(type) || (type.objectFlags & ts.ObjectFlags.Reference)) {
        for (const argument of checker.getTypeArguments(type)) directCanonicalNames(checker, argument, canonicalRoot, result, visited);
    }
    for (const declaration of type.aliasSymbol?.declarations ?? type.symbol?.declarations ?? []) {
        if (!ts.isClassDeclaration(declaration) && !ts.isInterfaceDeclaration(declaration)) continue;
        for (const clause of declaration.heritageClauses ?? []) {
            for (const heritageType of clause.types) {
                directCanonicalNames(checker, checker.getTypeAtLocation(heritageType), canonicalRoot, result, visited);
            }
        }
    }
    return result;
}

export function buildCanonicalCatalog(configPath, canonicalRoot) {
    const context = createProgramFromConfig(configPath);
    const index = context.program.getSourceFile(path.join(canonicalRoot, 'src', 'index.ts'));
    if (!index) throw new Error('Cannot load canonical REST contract index.ts.');
    const moduleSymbol = context.checker.getSymbolAtLocation(index);
    if (!moduleSymbol) throw new Error('Cannot resolve canonical REST contract module.');
    const byShape = new Map();
    for (const exported of context.checker.getExportsOfModule(moduleSymbol)) {
        const symbol = exported.flags & ts.SymbolFlags.Alias ? context.checker.getAliasedSymbol(exported) : exported;
        if (!symbol || !symbol.declarations?.length) continue;
        const declaration = symbol.declarations[0];
        if (!ts.isInterfaceDeclaration(declaration) && !ts.isTypeAliasDeclaration(declaration) && !ts.isEnumDeclaration(declaration)) continue;
        if ('typeParameters' in declaration && declaration.typeParameters?.length) continue;
        const type = context.checker.getDeclaredTypeOfSymbol(symbol);
        const shape = typeShape(context.checker, type);
        const key = shapeHash(shape);
        const names = byShape.get(key) ?? [];
        names.push(exported.name);
        byShape.set(key, names.sort(compareText));
    }
    return { ...context, canonicalRoot, byShape };
}

function wirePrimitiveShape(shape) {
    if (shape.kind === 'primitive' || shape.kind === 'literal') return true;
    return shape.kind === 'union' && shape.members.every(wirePrimitiveShape);
}

export function contractMetadata(checker, type, catalog) {
    if (!type) return { applicable: false, compatible: true, names: [], shapeHash: null };
    const shape = typeShape(checker, type);
    const directNames = directCanonicalNames(checker, type, catalog.canonicalRoot);
    const structuralNames = catalog.byShape.get(shapeHash(shape)) ?? [];
    const names = new Set([...directNames, ...structuralNames]);
    const primitive = wirePrimitiveShape(shape) && directNames.size === 0;
    return {
        applicable: !primitive,
        compatible: primitive || directNames.size > 0,
        names: [...names].sort(compareText),
        directNames: [...directNames].sort(compareText),
        structuralNames,
        shapeHash: shapeHash(shape),
        shape,
    };
}
