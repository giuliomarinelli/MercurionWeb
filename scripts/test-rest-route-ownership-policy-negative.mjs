import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const script = path.join(root, 'scripts', 'check-rest-route-ownership.mjs');
const sourceInventory = path.join(root, 'docs', 'architecture', 'rest-route-ownership.json');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mercurion-rest-route-ownership-'));
const temporaryInventory = path.join(temporaryDirectory, 'inventory.json');
const metadataProbe = path.join(
    root,
    'docs',
    'autonomous-development',
    'task',
    `.rest-route-ownership-metadata-probe-${process.pid}.md`,
);
const environment = { ...process.env, REST_ROUTE_OWNERSHIP_INVENTORY_PATH: temporaryInventory };

function run(argumentsToPass) {
    return spawnSync(process.execPath, [script, ...argumentsToPass], {
        cwd: root,
        encoding: 'utf8',
        env: environment,
    });
}

try {
    fs.copyFileSync(sourceInventory, temporaryInventory);
    execFileSync(process.execPath, [script, '--write'], { cwd: root, env: environment, stdio: 'pipe' });
    const firstOutput = fs.readFileSync(temporaryInventory, 'utf8');
    execFileSync(process.execPath, [script, '--write'], { cwd: root, env: environment, stdio: 'pipe' });
    assert.equal(fs.readFileSync(temporaryInventory, 'utf8'), firstOutput, 'inventory output must be deterministic');

    const deterministicInventory = JSON.parse(firstOutput);
    assert.equal(deterministicInventory.schemaVersion, 3, 'line-independent ownership inventory schema must be active');
    assert.equal(
        deterministicInventory.routes.some((route) => Object.hasOwn(route, 'line')),
        false,
        'route ownership records must not persist source line numbers',
    );
    assert.equal(
        deterministicInventory.routes.some((route) => route.references.some(
            (reference) => Object.hasOwn(reference, 'line'),
        )),
        false,
        'route ownership references must not persist source line numbers',
    );
    for (const route of deterministicInventory.routes) {
        const referenceKeys = route.references.map((reference) => `${reference.file}\u0000${reference.kind}`);
        assert.equal(
            new Set(referenceKeys).size,
            referenceKeys.length,
            `${route.method} ${route.path} references must be unique by file and kind`,
        );
    }
    assert.equal(
        deterministicInventory.routes.some((route) => route.references.some(
            (reference) => reference.file.startsWith('docs/autonomous-development/'),
        )),
        false,
        'autonomous control-plane metadata must not be treated as application route evidence',
    );

    const quotedRoutes = ['health', 'api', 'socket.io'].map((segment) => `/${segment}/`).join(', ');
    fs.writeFileSync(metadataProbe, `# Metadata probe\n\nObserved ${quotedRoutes}.\n`);
    execFileSync(process.execPath, [script, '--write'], { cwd: root, env: environment, stdio: 'pipe' });
    assert.equal(
        fs.readFileSync(temporaryInventory, 'utf8'),
        firstOutput,
        'autonomous task/report route mentions must not change the application inventory',
    );
    fs.rmSync(metadataProbe, { force: true });

    const unclassified = JSON.parse(firstOutput);
    unclassified.routes[0].classification = 'needs-human-classification';
    unclassified.routes[0].owner = 'Unassigned';
    unclassified.routes[0].evidence = ['Negative fixture'];
    fs.writeFileSync(temporaryInventory, `${JSON.stringify(unclassified, null, 2)}\n`);

    const unclassifiedResult = run([]);
    assert.notEqual(unclassifiedResult.status, 0, 'unclassified route must fail the ownership gate');
    assert.match(`${unclassifiedResult.stderr}${unclassifiedResult.stdout}`, /needs human classification/);

    fs.writeFileSync(temporaryInventory, firstOutput);
    const missingRecord = JSON.parse(firstOutput);
    missingRecord.routes.pop();
    fs.writeFileSync(temporaryInventory, `${JSON.stringify(missingRecord, null, 2)}\n`);

    const missingRecordResult = run([]);
    assert.notEqual(missingRecordResult.status, 0, 'route without an ownership record must fail the ownership gate');
    assert.match(`${missingRecordResult.stderr}${missingRecordResult.stdout}`, /inventory is stale/);
    assert.match(
        `${missingRecordResult.stderr}${missingRecordResult.stdout}`,
        /missing route inventory entry/,
        'stale inventory diagnostics must identify the drift category',
    );

    console.log('REST route ownership negative checks passed.');
} finally {
    fs.rmSync(metadataProbe, { force: true });
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
