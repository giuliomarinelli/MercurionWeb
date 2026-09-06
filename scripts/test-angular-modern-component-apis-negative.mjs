import assert from 'node:assert/strict';
import { collectModernComponentApiViolations } from './check-angular-modern-component-apis.mjs';

const source = `
  @Component({})
  export class LegacyComponent {
    @Input() value = '';
    @Output() changed = new EventEmitter<string>();
    constructor(private readonly service: Service) {}
  }
`;

const violations = collectModernComponentApiViolations('fixture.component.ts', source);
assert.equal(violations.length, 3);
assert.match(violations[0], /legacy Angular component decorator/);
assert.match(violations[1], /EventEmitter output/);
assert.match(violations[2], /constructor parameter injection/);

console.log('Angular modern component API negative policy check passed.');
