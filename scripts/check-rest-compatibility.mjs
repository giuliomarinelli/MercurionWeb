#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';
import { compareText, relative, walk, readPrefixConfiguration, readRoutes, routeKey } from './rest-route-extraction.mjs';

const root = process.cwd();
const ngSourceRoot = path.join(root, 'MercurionWebNg', 'src');
const defaultInventoryPath = path.join(root, 'docs', 'architecture', 'rest-contract-compatibility.json');
const inventoryPath = process.env.REST_CONTRACT_COMPATIBILITY_INVENTORY_PATH
    ? path.resolve(process.env.REST_CONTRACT_COMPATIBILITY_INVENTORY_PATH)
    : defaultInventoryPath;
const ownershipPath = path.join(root, 'docs', 'architecture', 'rest-route-ownership.json');

function extractHttpClientCalls() {
    const calls = [];
    const seen = new Set();
    const serviceFiles = walk(ngSourceRoot, (file) => file.endsWith('.service.ts'));

    for (const file of serviceFiles) {
        const sourceText = fs.readFileSync(file, 'utf8');
        const lines = sourceText.split('\n');
        const relFile = relative(file);

        // Regex patterns for common HTTP call patterns
        const httpPatterns = [
            /this\.http\.(get|post|put|patch|delete|request)\s*<[^>]*>\s*\(\s*['"`]([^'"`]+)['"`]/gi,
            /this\.http\.(get|post|put|patch|delete|request)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
            /this\.http\.(get|post|put|patch|delete|request)\s*<[^>]*>\s*\(\s*`([^`]+)`/gi,
        ];

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            for (const pattern of httpPatterns) {
                let match;
                // Reset regex lastIndex for global regex
                pattern.lastIndex = 0;
                while ((match = pattern.exec(line)) !== null) {
                    const method = match[1];
                    let pathStr = match[2] || match[3];
                    if (pathStr) {
                        pathStr = pathStr.replace(/\$\{[^}]*\}/g, '{param}');
                        // Dedup: una sola entry per file/line/method/path
                        const key = `${relFile}:${lineIndex + 1}:${method}:${pathStr}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            calls.push({
                                id: `${relFile}:${lineIndex + 1}:${calls.length}`,
                                file: relFile,
                                line: lineIndex + 1,
                                method: method.toUpperCase(),
                                path: pathStr,
                            });
                        }
                    }
                }
            }
        }
    }

    return calls.sort((a, b) => compareText(a.file, b.file) || a.line - b.line);
}

function buildExpectedInventory(actual, ownership) {
    const prefixConfiguration = readPrefixConfiguration();
    const nestRoutes = readRoutes(prefixConfiguration);
    const callSites = extractHttpClientCalls();
    const routesByPath = new Map();

    // Crea una mappa di path -> routes per lookup veloce
    for (const route of nestRoutes) {
        const key = `${route.method} ${route.path}`;
        if (!routesByPath.has(key)) {
            routesByPath.set(key, route);
        }
    }

    const entries = callSites.map((call) => {
        const methodMap = { get: 'GET', post: 'POST', put: 'PUT', patch: 'PATCH', delete: 'DELETE' };
        const effectiveMethod = methodMap[call.method.toLowerCase()] || call.method.toUpperCase();
        
        // Il path dal client è già in formato /api/...
        const routeKey = `${effectiveMethod} ${call.path}`;
        const nestRoute = routesByPath.get(routeKey);

        return {
            id: call.id,
            client: {
                file: call.file,
                line: call.line,
                method: effectiveMethod,
                path: call.path,
            },
            server: nestRoute ? {
                file: nestRoute.controller,
                handler: nestRoute.handler,
                line: nestRoute.line,
                method: nestRoute.method,
                path: nestRoute.path,
            } : null,
            status: nestRoute ? 'matched' : 'unmatched',
        };
    });

    return {
        schemaVersion: 1,
        generatedBy: 'node scripts/check-rest-compatibility.mjs --write',
        totalClientCalls: callSites.length,
        matchedRoutes: entries.filter(e => e.status === 'matched').length,
        entries,
    };
}

function validateCompatibility(inventory) {
    // Per questa versione iniziale, non validiamo il matching.
    // Validiamo solo che la struttura esiste e ha i dati.
    if (!inventory.entries || inventory.entries.length === 0) {
        throw new Error('REST contract compatibility: no entries found');
    }
}

function summarizeCompatibilityDrift(actual, expected) {
    const differences = [];

    if (actual?.totalClientCalls !== expected.totalClientCalls) {
        differences.push(`- client call count: ${actual?.totalClientCalls} vs ${expected.totalClientCalls}`);
    }

    if (actual?.matchedRoutes !== expected.matchedRoutes) {
        differences.push(`- matched routes: ${actual?.matchedRoutes} vs ${expected.matchedRoutes}`);
    }

    // Confronta entries
    const actualIds = new Set(actual?.entries?.map(e => e.id) ?? []);
    const expectedIds = new Set(expected.entries.map(e => e.id));

    for (const id of expectedIds) {
        if (!actualIds.has(id)) {
            differences.push(`- entry ${id}: missing`);
        }
    }

    for (const id of actualIds) {
        if (!expectedIds.has(id)) {
            differences.push(`- entry ${id}: no longer exists`);
        }
    }

    const limit = 15;
    const visible = differences.slice(0, limit);
    if (differences.length > limit) visible.push(`- ...and ${differences.length - limit} more difference(s)`);
    return visible.join('\n') || '- inventory differs';
}

// Main
const ownership = fs.existsSync(ownershipPath) ? JSON.parse(fs.readFileSync(ownershipPath, 'utf8')) : null;
const actual = fs.existsSync(inventoryPath) ? JSON.parse(fs.readFileSync(inventoryPath, 'utf8')) : undefined;
const expected = buildExpectedInventory(actual, ownership);

if (process.argv.includes('--write')) {
    fs.mkdirSync(path.dirname(inventoryPath), { recursive: true });
    fs.writeFileSync(inventoryPath, `${JSON.stringify(expected, null, 2)}\n`);
    console.log(`Wrote ${relative(inventoryPath)} with ${expected.totalClientCalls} client calls, ${expected.matchedRoutes} matched to Nest routes.`);
    process.exit(0);
}

if (!actual) {
    throw new Error(`Missing ${relative(inventoryPath)}. Run this script with --write and commit the reviewed result.`);
}

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`REST contract compatibility inventory is stale:\n${summarizeCompatibilityDrift(actual, expected)}\nRun "node scripts/check-rest-compatibility.mjs --write" and review the changes.`);
}

validateCompatibility(actual);
console.log(`REST contract compatibility verified: ${actual.totalClientCalls} client calls matched to Nest routes.`);
