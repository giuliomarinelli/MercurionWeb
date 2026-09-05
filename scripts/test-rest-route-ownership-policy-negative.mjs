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

    console.log('REST route ownership negative checks passed.');
} finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
