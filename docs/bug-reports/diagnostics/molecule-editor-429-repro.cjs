// Historical characterization of the report's reference commit, NOT acceptance tests.
// Run from any directory: node docs/bug-reports/diagnostics/molecule-editor-429-repro.cjs
// No HTTP, Redis, browser, credentials, dependency installation, or source mutation.
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const rx = require('rxjs');
const { TestScheduler } = require('rxjs/testing');
const root = path.resolve(__dirname, '../../..');
const reference = 'd9b09eb88c079e00e98efca40384208784288d89';
const historical = file => execFileSync('git', ['show', `${reference}:${file}`], { cwd: root, encoding: 'utf8' });
const source = historical('MercurionWebNg/src/app/pages/molecule-editor/molecule-editor.page.component.ts');
const ast = ts.createSourceFile('editor.ts', source, ts.ScriptTarget.Latest, true);
const declaration = ast.statements.find(node => ts.isClassDeclaration(node) && node.name.text === 'MoleculeEditorPageComponent');
assert.ok(declaration, 'Source layout changed: review diagnostic extraction');
const method = name => {
  const result = declaration.members.find(node => node.name?.getText(ast) === name);
  assert.ok(result, `Missing source method ${name}`);
  return result;
};
const pipeline = method('ngOnInit').body.statements.find(node => node.getText(ast).startsWith('this.molDupSub ='));
assert.ok(pipeline, 'Missing source pipeline');
const selected = ['onSmilesPollExported', 'setCurrentCanonicalSmiles', 'checkDupe', 'canonicalizeForEditor'];
const isolated = `class DiagnosticEditor {
  start() { ${pipeline.getText(ast)} }
  ${selected.map(name => method(name).getText(ast)).join('\n')}
}
globalThis.DiagnosticEditor = DiagnosticEditor;`;
const context = vm.createContext({ ...rx });
vm.runInContext(ts.transpileModule(isolated, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
const signal = value => Object.assign(() => value, { set: next => { value = next; } });
function editor(canonical = ({ smiles }) => rx.of(smiles), duplicate = () => rx.of(null)) {
  const result = new context.DiagnosticEditor();
  Object.assign(result, {
    polledSmiles$: new rx.Subject(), destroy$: new rx.Subject(), validationRevision: 0,
    currentCanonicalSmiles: signal(''), baselineSmiles: signal(''), lock: signal(true),
    untouched: signal(true), tab: signal('std'), mode: signal('create'), pendingAction: signal('save'),
    drafts: { record() {} }, logger: { error() {} }, toast: { trigger() {} },
    RDKitAPI: { toCanonicalSmiles: canonical },
    moleculeCollectionItemService: { findOneCustomMoleculeByCanonicalSmiles_shortFetch: duplicate }
  });
  return result;
}
let passed = 0;
async function check(name, run) {
  await run();
  passed++;
  console.log(`CONFIRMED ${name}`);
}
function virtual(run) {
  const scheduler = new TestScheduler((actual, expected) => assert.deepEqual(actual, expected));
  scheduler.run(() => run(scheduler));
}
async function main() {
  await check('429 canonical: identical exports do not retry after 5 minutes', () => virtual(s => {
    let calls = 0;
    const e = editor(() => { calls++; return rx.throwError(() => ({ status: 429 })); });
    e.start();
    e.onSmilesPollExported('CC');
    for (let t = 250; t <= 301000; t += 250) s.schedule(() => e.onSmilesPollExported('CC'), t);
    s.schedule(() => { assert.equal(calls, 1); assert.equal(e.currentCanonicalSmiles(), ''); e.molDupSub.unsubscribe(); }, 301001);
  }));
  await check('clear during debounce: old structure is published and save unlocked', () => virtual(s => {
    const e = editor(); e.start(); e.onSmilesPollExported('CC');
    s.schedule(() => e.onSmilesPollExported(''), 100);
    s.schedule(() => { assert.equal(e.currentCanonicalSmiles(), 'CC'); assert.equal(e.lock(), false); e.molDupSub.unsubscribe(); }, 301);
  }));
  await check('clear during REST: late canonical response restores old identity', () => virtual(s => {
    const response = new rx.Subject(); const e = editor(() => response); e.start(); e.onSmilesPollExported('CC');
    s.schedule(() => e.onSmilesPollExported(''), 400);
    s.schedule(() => response.next('CC'), 600);
    s.schedule(() => { assert.equal(e.currentCanonicalSmiles(), 'CC'); assert.equal(e.lock(), false); e.molDupSub.unsubscribe(); }, 601);
  }));
  await check('A -> empty -> A: canonical dedup leaves identity empty and save locked', () => virtual(s => {
    let duplicates = 0; const e = editor(undefined, () => { duplicates++; return rx.of(null); });
    e.start(); e.onSmilesPollExported('CC');
    s.schedule(() => e.onSmilesPollExported(''), 400);
    s.schedule(() => e.onSmilesPollExported('CC'), 600);
    s.schedule(() => { assert.equal(duplicates, 1); assert.equal(e.currentCanonicalSmiles(), ''); assert.equal(e.lock(), true); e.molDupSub.unsubscribe(); }, 901);
  }));
  await check('old duplicate response unlocks while new REST canonicalization is pending', () => virtual(s => {
    const oldDuplicate = new rx.Subject(); const newCanonical = new rx.Subject();
    const e = editor(({ smiles }) => smiles === 'CC' ? rx.of('CC') : newCanonical, () => oldDuplicate);
    e.start(); e.onSmilesPollExported('CC');
    s.schedule(() => e.onSmilesPollExported('CCC'), 400);
    s.schedule(() => oldDuplicate.next(null), 800);
    s.schedule(() => { assert.equal(e.currentCanonicalSmiles(), 'CC'); assert.equal(e.lock(), false); e.molDupSub.unsubscribe(); }, 801);
  }));
  await check('duplicate 429 is interpreted as absence and unlocks save', () => virtual(s => {
    const e = editor(undefined, () => rx.throwError(() => ({ status: 429 }))); e.start(); e.onSmilesPollExported('CC');
    s.schedule(() => { assert.equal(e.lock(), false); e.molDupSub.unsubscribe(); }, 301);
  }));
  await check('revision increment does not reject an already pending canonical response', () => virtual(s => {
    const response = new rx.Subject(); const e = editor(() => response); e.start(); e.onSmilesPollExported('CC');
    s.schedule(() => { e.validationRevision++; e.currentCanonicalSmiles.set(''); e.lock.set(true); }, 400);
    s.schedule(() => response.next('CC'), 600);
    s.schedule(() => { assert.equal(e.currentCanonicalSmiles(), 'CC'); assert.equal(e.lock(), false); e.molDupSub.unsubscribe(); }, 601);
  }));
  await check('500 ms edits: 600 REST + 600 duplicate calls in 300 seconds (unlimited mock server)', () => virtual(s => {
    let rest = 0, duplicate = 0;
    const e = editor(({ smiles }) => { rest++; return rx.of(smiles); }, () => { duplicate++; return rx.of(null); }); e.start();
    for (let i = 0; i < 600; i++) s.schedule(() => e.onSmilesPollExported(i % 2 ? 'CCC' : 'CC'), i * 500);
    s.schedule(() => { assert.equal(rest, 600); assert.equal(duplicate, 600); e.molDupSub.unsubscribe(); }, 300000);
  }));
  await check('explicit save: duplicate 429 still returns a usable canonical structure', async () => {
    const e = editor(undefined, () => rx.throwError(() => ({ status: 429 })));
    assert.equal(await e.checkDupe('CC'), 'CC');
  });
  await check('initialization fallback: raw input is returned as canonical after REST 429', async () => {
    const e = editor(() => rx.throwError(() => ({ status: 429 })));
    assert.equal(await rx.firstValueFrom(e.canonicalizeForEditor('C(C)O', 'diagnostic')), 'C(C)O');
  });
  const html = historical('MercurionWebNg/public/ketcher/index.html');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const bridge = scripts.find(match => match[1].includes('let lastSmiles'))?.[1];
  assert.ok(bridge, 'Missing bridge source');
  function bridgeContext(getSmiles) {
    const messages = [];
    const window = { top: {}, self: {}, ketcher: { getSmiles }, parent: { postMessage: message => messages.push(message) }, addEventListener() {} };
    const c = vm.createContext({ window, AbortController, matchMedia: () => ({ matches: false }), document: { addEventListener() {} }, console: { error() {}, warn() {} }, setTimeout });
    vm.runInContext(bridge, c);
    return c;
  }
  await check('bridge: change during export is lost; another dirty event repairs cached SMILES', async () => {
    let release, calls = 0;
    const c = bridgeContext(() => { calls++; return calls === 1 ? new Promise(resolve => { release = resolve; }) : Promise.resolve('CCC'); });
    vm.runInContext('markDirty()', c);
    const pending = vm.runInContext('refreshSmilesIfNeeded()', c);
    vm.runInContext('markDirty()', c); // actual newer vendor structure would now be CCC
    release('CC'); await pending;
    await vm.runInContext('refreshSmilesIfNeeded()', c);
    assert.equal(vm.runInContext('lastSmiles', c), 'CC'); assert.equal(calls, 1);
    vm.runInContext('markDirty()', c); // e.g. unrelated pointerdown
    await vm.runInContext('refreshSmilesIfNeeded()', c);
    assert.equal(vm.runInContext('lastSmiles', c), 'CCC'); assert.equal(calls, 2);
  });
  await check('bridge: export failure is swallowed and previous cache remains readable', async () => {
    let calls = 0;
    const c = bridgeContext(() => ++calls === 1 ? Promise.resolve('CC') : Promise.reject(new Error('export failed')));
    await vm.runInContext('refreshSmilesIfNeeded(true)', c);
    vm.runInContext('markDirty()', c);
    await vm.runInContext('refreshSmilesIfNeeded()', c);
    assert.equal(vm.runInContext('lastSmiles', c), 'CC');
    assert.equal(vm.runInContext('dirty', c), true);
  });
  await check('shared RPC: pending PCP causes RDKit rejection after queue wait with only two calls', async () => {
    const policySource = historical('MercurionWebNode/src/app_modules/mercurion-ai/services/scientific-rpc.policy.ts');
    const policyAst = ts.createSourceFile('policy.ts', policySource, ts.ScriptTarget.Latest, true);
    const policyClass = policyAst.statements.find(node => ts.isClassDeclaration(node) && node.name.text === 'ScientificRpcPolicy');
    assert.ok(policyClass);
    // Keep actual admission/queue/dispatch code. Stub unrelated Nest DI,
    // contract validation and error construction; no real NATS transport.
    const pc = vm.createContext({
      ...rx, setTimeout, clearTimeout, Buffer, Injectable: () => value => value,
      assertNatsRequest() {}, assertNatsResponse() {},
      ApplicationErrorCode: new Proxy({}, { get: (_, name) => name }),
      applicationError: code => Object.assign(new Error(code), { code })
    });
    const code = `${policyClass.getText(policyAst).replace(/^export /m, '')}\nglobalThis.Policy = ScientificRpcPolicy;`;
    vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText, pc);
    const values = {
      'App.maxNatsPayloadBytes': 4096, 'App.scientificRpc.maxInFlight': 1,
      'App.scientificRpc.maxQueue': 2, 'App.scientificRpc.queueWaitMs': 250,
      'App.scientificRpc.timeoutMs': 3000
    };
    const policy = new pc.Policy({ getOrThrow: key => values[key] }, { record() {} });
    const first = new rx.Subject();
    const active = policy.execute({ operation: 'pcp', client: { send: () => first }, payload: {}, contract: {}, subject: 'fake-pcp' });
    let canonicalSent = false;
    try {
      await assert.rejects(policy.execute({
        operation: 'canonical', client: { send: () => { canonicalSent = true; return rx.of('CC'); } },
        payload: {}, contract: {}, subject: 'fake-canonical'
      }), { code: 'SCIENTIFIC_RPC_OVERLOADED' });
      assert.equal(canonicalSent, false);
    } finally {
      first.next('ethane'); first.complete(); await active;
    }
  });
  console.log(`${passed}/${passed} diagnostic scenarios confirmed. These results demonstrate defects, not acceptance of a fix.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
