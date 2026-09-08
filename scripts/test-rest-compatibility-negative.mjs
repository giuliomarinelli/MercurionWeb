#!/usr/bin/env node
import { buildInventory, validateCompatibility } from './check-rest-compatibility.mjs';

const baseline = buildInventory();
const cases = [
    {
        name: 'wrong verb',
        select: (entry) => Boolean(entry.server),
        mutate: (entry) => { entry.consumer.verb = entry.consumer.verb === 'GET' ? 'POST' : 'GET'; },
    },
    {
        name: 'wrong path',
        select: (entry) => Boolean(entry.server),
        mutate: (entry) => { entry.consumer.path = `${entry.consumer.path}/wrong`; },
    },
    {
        name: 'wrong query parameter',
        select: (entry) => entry.consumer.queryParameters.length > 0,
        mutate: (entry) => {
            entry.consumer.queryParameters = [{
                name: 'wrong_query',
                wireType: 'string',
                sourceTypes: ['string'],
                optional: false,
            }];
        },
    },
    {
        name: 'incompatible request body',
        select: (entry) => entry.consumer.body.contract.applicable,
        mutate: (entry) => {
            entry.consumer.body.type = 'IncompatibleBodyDTO';
            entry.consumer.body.contract.canonicalNames = ['IncompatibleBodyDTO'];
            entry.consumer.body.contract.shapeHash = 'incompatible-request-shape';
        },
    },
    {
        name: 'wrong success status',
        select: (entry) => Number.isInteger(entry.server?.successStatus),
        mutate: (entry) => { entry.server.successStatus = entry.server.successStatus === 200 ? 201 : 200; },
    },
    {
        name: 'incompatible response shape',
        select: (entry) => entry.consumer.response.contract.applicable,
        mutate: (entry) => {
            entry.consumer.response.type = 'IncompatibleResponseDTO';
            entry.consumer.response.contract.canonicalNames = ['IncompatibleResponseDTO'];
            entry.consumer.response.contract.shapeHash = 'incompatible-response-shape';
        },
    },
];

for (const { name, select, mutate } of cases) {
    const mutation = structuredClone(baseline);
    const entry = mutation.entries.find(select);
    if (!entry) throw new Error(`${name}: no applicable entry available for mutation`);
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
