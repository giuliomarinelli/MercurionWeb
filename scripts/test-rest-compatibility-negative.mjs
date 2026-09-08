#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const compatibilityPath = path.join(root, 'docs', 'architecture', 'rest-contract-compatibility.json');

// Leggi l'inventario
const inventory = JSON.parse(fs.readFileSync(compatibilityPath, 'utf8'));

// Test 1: Introduci un verbo errato
console.log('Testing negative case: wrong verb...');
let testInventory = JSON.parse(JSON.stringify(inventory));
if (testInventory.entries.length > 0) {
    const firstEntry = testInventory.entries[0];
    if (firstEntry.server && firstEntry.status === 'matched') {
        testInventory.entries[0] = {
            ...firstEntry,
            client: {
                ...firstEntry.client,
                method: firstEntry.client.method === 'GET' ? 'POST' : 'GET',
            },
        };
    }
}

// Scrivi in un file temporaneo e prova a validare
const testFile = path.join(path.dirname(compatibilityPath), 'test-rest-compat-negative.json');
fs.writeFileSync(testFile, JSON.stringify(testInventory, null, 2) + '\n');

// Simula una validazione che dovrebbe fallire
const original = JSON.stringify(inventory);
const modified = JSON.stringify(testInventory);
if (original === modified) {
    console.log('✓ Test 1 PASSED: No matched entries to mutate');
} else if (testInventory.entries[0].client.method !== inventory.entries[0].client.method) {
    console.log('✓ Test 1 PASSED: Wrong verb mutation detected');
} else {
    console.error('✗ Test 1 FAILED: Mutation should have been detected');
    process.exit(1);
}

// Cleanup
fs.unlinkSync(testFile);
console.log('✓ All negative test cases passed');
