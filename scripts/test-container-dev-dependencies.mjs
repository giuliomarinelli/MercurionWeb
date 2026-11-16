import assert from 'node:assert/strict';
import { test } from 'node:test';
import { devOnlyDependencies } from './lib/container-dev-dependencies.mjs';

const manifest = { devDependencies: { tool: '1' } };
test('root-only development package is forbidden in production', () => {
  assert.deepEqual(devOnlyDependencies(manifest, { 'node_modules/tool': { dev: true } }), ['tool']);
});
test('workspace-only development package is supported', () => {
  assert.deepEqual(devOnlyDependencies(manifest, { 'MercurionWebNode/node_modules/tool': { dev: true } }), ['tool']);
});
test('root production dependency remains allowed despite workspace dev declaration', () => {
  assert.deepEqual(devOnlyDependencies(manifest, {
    'node_modules/tool': { version: '2' }, 'MercurionWebNode/node_modules/tool': { version: '1', dev: true },
  }), []);
});
test('workspace production dependency remains allowed despite root dev declaration', () => {
  assert.deepEqual(devOnlyDependencies(manifest, {
    'node_modules/tool': { dev: true }, 'MercurionWebNode/node_modules/tool': {},
  }), []);
});
test('missing lock entry fails closed', () => {
  assert.throws(() => devOnlyDependencies(manifest, {}), /Missing locked/);
});
