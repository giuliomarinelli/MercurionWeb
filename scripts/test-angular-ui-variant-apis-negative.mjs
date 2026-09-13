import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { findUiVariantApiViolations } from './check-angular-ui-variant-apis.mjs';

const violations = await findUiVariantApiViolations([
  fileURLToPath(new URL('./fixtures/angular-ui-variant-api-negative', import.meta.url)),
]);

assert.equal(violations.length, 2);
assert.match(violations[0], /buttonClass/);
assert.match(violations[1], /classList/);
console.log('Angular UI variant API negative policy check passed.');
