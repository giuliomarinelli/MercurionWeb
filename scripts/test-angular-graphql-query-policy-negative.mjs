import assert from 'node:assert/strict';
import { collectGraphqlQueryPolicyViolations } from './check-angular-graphql-query-policy.mjs';

const unjustifiedNetworkWatcher = collectGraphqlQueryPolicyViolations(
  'MercurionWebNg/src/app/services/graphql/fixture.service.ts',
  `apollo.watchQuery({
    query: FixtureDocument,
    fetchPolicy: 'network-only',
  }).valueChanges;`,
);

assert.ok(unjustifiedNetworkWatcher.length > 0);
assert.match(unjustifiedNetworkWatcher.join('\n'), /watchQuery requires/);

const missingOneShotPolicy = collectGraphqlQueryPolicyViolations(
  'MercurionWebNg/src/app/services/graphql/fixture.service.ts',
  `apollo.query<FixtureQuery>({
    query: FixtureDocument,
  });`,
);

assert.ok(missingOneShotPolicy.length > 0);
assert.match(missingOneShotPolicy.join('\n'), /explicit fetchPolicy/);

const documentedReactiveWatcher = collectGraphqlQueryPolicyViolations(
  'MercurionWebNg/src/app/services/graphql/fixture.service.ts',
  `// graphql-watch: policy=cache-and-network owner=FixtureFacade teardown=destroyRef reason=live-fixture
  apollo.watchQuery({
    query: FixtureDocument,
    fetchPolicy: 'cache-and-network',
  }).valueChanges;`,
);

assert.deepEqual(documentedReactiveWatcher, []);

const documentedNetworkWatcher = collectGraphqlQueryPolicyViolations(
  'MercurionWebNg/src/app/services/graphql/fixture.service.ts',
  `// graphql-watch: policy=network-only owner=FixtureFacade teardown=destroyRef reason=server-authoritative-live-view allow-network-only=true
  apollo.watchQuery({
    query: FixtureDocument,
    fetchPolicy: 'network-only',
  }).valueChanges;`,
);

assert.deepEqual(documentedNetworkWatcher, []);

console.log('Angular GraphQL query lifecycle policy negative check passed.');
