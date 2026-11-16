import assert from 'node:assert/strict';
import { collectArchitecturePolicyViolations } from './check-architecture-policy.mjs';

const violations = collectArchitecturePolicyViolations({
  angularFiles: new Map([
    ['services/auth.service.ts', "import { LoginPage } from '../pages/login/login.page';"],
  ]),
  nestFiles: new Map([
    ['utils/domain.util.ts', "import { AuthModule } from '../app_modules/auth/auth.module';"],
  ]),
});

assert.equal(violations.length, 2);
assert.match(violations[0], /Angular rule services -> pages/);
assert.match(violations[1], /Nest rule utils -> app_modules/);

const lazyBoundary = collectArchitecturePolicyViolations({
  angularFiles: new Map([
    ['components/action.component.ts', "const load = () => import('../pages/action/action.page');"],
  ]),
});
assert.equal(lazyBoundary.length, 0);
console.log('Architecture policy negative fixtures reject forbidden layers and preserve lazy boundaries.');
