#!/usr/bin/env node
import { buildInventory, validateCompatibility } from './check-rest-compatibility.mjs';

const baseline = buildInventory();
const cases = [
    ['wrong verb', (entry) => { entry.consumer.verb = entry.consumer.verb === 'GET' ? 'POST' : 'GET'; }],
    ['wrong path', (entry) => { entry.consumer.path = `${entry.consumer.path}/wrong`; }],
    ['wrong query parameter', (entry) => { entry.consumer.queryParameters = [{ name: 'wrong_query', type: 'string', optional: false }]; }],
    ['incompatible request body', (entry) => { entry.consumer.body = { expression: 'body', type: 'IncompatibleBodyDTO' }; }],
    ['wrong success status', (entry) => { entry.server.successStatus = entry.server.successStatus === 200 ? 201 : 200; }],
    ['incompatible response shape', (entry) => { entry.consumer.response.type = 'IncompatibleResponseDTO'; }],
];

for (const [name, mutate] of cases) {
    const mutation = structuredClone(baseline);
    const entry = mutation.entries.find((candidate) => candidate.server && candidate.consumer.response.type);
    if (!entry) throw new Error(`${name}: no structured entry available for mutation`);
    mutate(entry);
    let rejected = false;
    try {
        validateCompatibility(mutation, baseline);
    } catch (error) {
        rejected = String(error).includes(entry.id) && String(error).includes(entry.server.handler);
    }
    if (!rejected) throw new Error(`${name}: validator accepted mutation or omitted consumer/server diagnostics`);
    console.log(`negative check passed: ${name}`);
}
