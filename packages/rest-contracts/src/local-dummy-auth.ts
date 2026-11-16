/**
 * Public, non-secret constants for the deterministic local-development auth fixture.
 * Server-side acceptance still fails closed unless Nest is explicitly started
 * with APP_ENV=development and LOCAL_DUMMY_AUTH=true.
 */
export const LOCAL_DUMMY_AUTH = Object.freeze({
  canonicalOrigin: 'http://localhost:8888',
  headerName: 'X-Mercurion-Local-Dummy-Auth',
  marker: 'enabled',
  storageKey: 'mercurion.localDummyAuth',
  initials: 'LD',
  email: 'local-dummy@localhost.invalid',
  firstName: 'Local',
  lastName: 'Dummy',
  userId: '00000000-0000-4000-8000-000000000101'
} as const)

export type LocalDummyAuthMarker = typeof LOCAL_DUMMY_AUTH.marker
