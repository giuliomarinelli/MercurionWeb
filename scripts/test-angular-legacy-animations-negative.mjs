import assert from 'node:assert/strict';
import { collectLegacyAnimationViolations } from './check-angular-legacy-animations.mjs';

const packageManifest = {
  dependencies: {
    '@angular/animations': '20.3.30',
    'ngx-spinner': '19.0.0',
  },
};

const sourceFiles = [{
  file: 'fixture.ts',
  source: `import { provideAnimations } from '@angular/platform-browser/animations';\nprovideAnimations();`,
}];

const violations = await collectLegacyAnimationViolations(
  sourceFiles.map((file) => file),
  packageManifest,
);

assert.equal(violations.length, 4);
assert.match(violations[0], /@angular\/animations/);
assert.match(violations[1], /ngx-spinner/);
assert.match(violations[2], /legacy browser animation import/);
assert.match(violations[3], /provideAnimations provider/);

console.log('Angular legacy animation dependency negative policy check passed.');
