/**
 * Canonical Apollo read policies.
 *
 * - stableReference: immutable/reference data may be served from the normalized
 *   cache and only reaches the network on a cache miss.
 * - mutableSnapshot: user-owned or operational state must be fresh when the
 *   caller explicitly requests it. The request is still one-shot; the result is
 *   written to the cache for normalized entities.
 * - ephemeralLookup: request-specific results that must be fresh and should not
 *   populate the normalized cache.
 * - ownedReactive: a retained watcher may emit cached data before refreshing,
 *   but only when its owner and teardown are documented at the call site.
 */
export const GRAPHQL_QUERY_FETCH_POLICY = {
  stableReference: 'cache-first',
  mutableSnapshot: 'network-only',
  ephemeralLookup: 'no-cache',
  ownedReactive: 'cache-and-network',
} as const;

