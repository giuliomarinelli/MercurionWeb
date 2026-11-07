// QA driver: load the actual compiled scientific services from the selected image.
// Only configuration and logging/metrics sinks are supplied by the harness.
const { createRequire } = require('node:module');
const { createInterface } = require('node:readline');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const app = createRequire('/usr/src/app/package.json');
app('reflect-metadata');
const { ConfigService } = app('@nestjs/config');
const { ClientProxyFactory } = app('@nestjs/microservices');
const root = '/usr/src/app/dist/src/';
const { createNatsTransportOptions } = app(root + 'nats-transport.js');
const { ScientificRpcPolicy } = app(root + 'app_modules/mercurion-ai/services/scientific-rpc.policy.js');
const { MercurionAIService } = app(root + 'app_modules/mercurion-ai/services/mercurion-ai.service.js');
const { RDKitService } = app(root + 'app_modules/mercurion-ai/services/rd-kit.service.js');
const { PcpService } = app(root + 'app_modules/mercurion-ai/services/pcp.service.js');
const { ApplicationErrorCode } = app(root + 'exception-handling/application-error.js');
const identity = app(root + 'generated/build-identity.js').buildIdentity;
const session = randomUUID();
const samples = [];
const logger = { forContext: () => ({ log() {}, warn() {}, error() {}, debug() {} }) };
function services(environment) {
  const config = new ConfigService({ App: { env: environment, natsUrl: process.env.QA_NATS_URL,
    maxNatsPayloadBytes: 65536, scientificRpc: { maxInFlight: 4, maxQueue: 4, queueWaitMs: 300, timeoutMs: 1500 } } });
  const client = ClientProxyFactory.create(createNatsTransportOptions(config));
  const policy = new ScientificRpcPolicy(config, { record: value => samples.push(value) });
  return { client, inference: new MercurionAIService(client, config, logger, policy),
    rdkit: new RDKitService(client, config, logger, policy), pcp: new PcpService(client, config, logger, policy) };
}
const active = services('production');
async function rejected(action, codes) {
  try { await action(); } catch (error) {
    assert.ok(codes.includes(error.code), 'Unexpected application error: ' + error.code);
    return { code: error.code, message: error.message };
  }
  throw Error('Expected request rejection');
}
const unavailableCodes = [ApplicationErrorCode.TOX21_TIMEOUT, ApplicationErrorCode.SCIENTIFIC_RPC_UNAVAILABLE];
async function positive() {
  const inference = await active.inference.getInferenceFromTop4MercurionTox21({ smiles: 'CCO' });
  assert.deepEqual(Object.keys(inference).sort(), ['NR-AhR', 'SR-ATAD5', 'SR-MMP', 'SR-p53'].sort());
  for (const value of Object.values(inference)) {
    assert.ok(Number.isFinite(value.probability) && value.probability >= 0 && value.probability <= 1);
    assert.ok(Number.isFinite(value.threshold) && value.threshold >= 0 && value.threshold <= 1);
    assert.equal(value.is_positive, value.probability > value.threshold);
  }
  const properties = await active.rdkit.getMoleculeProperties({ smiles: 'CCO' });
  assert.ok(Math.abs(properties.mwFreebase - 46.069) < 0.01);
  assert.equal(await active.rdkit.toCanonicalSmiles({ smiles: 'OCC' }), 'CCO');
  assert.equal(await active.rdkit.areSameStructure({ a: 'CCO', b: 'OCC' }), true);
  assert.equal(await active.rdkit.areSameStructure({ a: 'CCO', b: 'CCN' }), false);
  return { inference, properties, canonical: 'CCO', same: true, different: false };
}
async function execute(command) {
  switch (command) {
    case 'positive': return positive();
    case 'outage': return rejected(() => active.inference.getInferenceFromTop4MercurionTox21({ smiles: 'CCO' }), unavailableCodes);
    case 'wrong-namespace': {
      const other = services('staging');
      try {
        await other.client.connect();
        return await rejected(() => other.inference.getInferenceFromTop4MercurionTox21({ smiles: 'CCO' }), unavailableCodes);
      } finally { other.client.close(); }
    }
    case 'public-auth': {
      const without = await active.inference.getInferenceFromTop4MercurionTox21({ smiles: 'CCO' });
      const invalid = await active.inference.getInferenceFromTop4MercurionTox21({ smiles: 'CCO', accessToken: 'deliberately-invalid-qa-token' });
      assert.deepEqual(without, invalid);
      return { absentTokenAccepted: true, invalidTokenAccepted: true, mode: 'current-global-skip-auth' };
    }
    case 'invalid-input': {
      const rdkit = await rejected(() => active.rdkit.toCanonicalSmiles({ smiles: 'not-a-smiles' }), [ApplicationErrorCode.TOX21_UPSTREAM_ERROR]);
      const pcp = await rejected(() => active.pcp.getIupacNameFromSmiles({ smiles: 'not-a-smiles' }), [ApplicationErrorCode.TOX21_UPSTREAM_ERROR]);
      assert.ok(rdkit.message.includes('Invalid SMILES') && pcp.message.includes('Invalid SMILES'));
      return { rdkit, pcp, pubchem: 'invalid-smiles-before-provider-only' };
    }
    case 'metrics': return samples.filter(value => value.name === 'count');
    default: throw Error('Unknown QA command');
  }
}
function emit(value) { process.stdout.write('T21_RESULT ' + JSON.stringify({ session, ...value }) + '\n'); }
async function main() {
  await active.client.connect();
  emit({ ready: true, identity });
  try {
    for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
      const request = JSON.parse(line);
      if (request.command === 'close') { emit({ id: request.id, ok: true }); break; }
      try { emit({ id: request.id, ok: true, result: await execute(request.command) }); }
      catch (error) { emit({ id: request.id, ok: false, error: error.stack }); }
    }
  } finally { active.client.close(); }
}
main().catch(error => { emit({ fatal: error.stack }); process.exitCode = 1; });
