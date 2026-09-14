import { routes } from './app.routes'
import { routePolicyOf, RouteAccess, RouteShell } from './route-policy'

describe('route policy metadata', () => {
  const expected: readonly [string, RouteAccess, RouteShell][] = [
    ['', 'public', 'welcome'],
    ['welcome', 'logged-out-only', 'welcome'],
    ['login', 'logged-out-only', 'standard'],
    ['__local/dummy-auth', 'public', 'standard'],
    ['profile', 'authenticated', 'standard'],
    ['dashboard', 'authenticated', 'standard'],
    ['login/mfa', 'public', 'standard'],
    ['login/mfa/:view', 'public', 'standard'],
    ['molecules/detail/:molId', 'public', 'standard'],
    ['molecules/editor', 'authenticated', 'standard'],
    ['forgot-password', 'logged-out-only', 'standard'],
    ['password-recovery', 'public', 'standard'],
    ['molecules/collections', 'authenticated', 'standard'],
    ['molecules/collections/detail/:colId', 'authenticated', 'standard'],
    ['register', 'logged-out-only', 'standard'],
    ['account/activate', 'public', 'standard'],
    ['molecules/all-my-molecules', 'authenticated', 'standard'],
    ['settings', 'authenticated', 'standard'],
    ['account-recovery', 'logged-out-only', 'standard'],
    ['oauth2/callback', 'public', 'standard'],
    ['help', 'authenticated', 'standard'],
    ['feedback', 'authenticated', 'standard'],
    ['404-not-found', 'public', 'minimal'],
    ['403-forbidden', 'public', 'minimal'],
    ['privacy', 'public', 'standard'],
    ['terms-and-policies', 'public', 'standard'],
    ['contacts', 'public', 'standard'],
    ['admin/maintenance/:token', 'public', 'standard'],
    ['**', 'public', 'minimal']
  ]

  it('annotates every current route with the expected access and shell policy', () => {
    expect(routes).toHaveSize(expected.length)

    for (const [path, access, shell] of expected) {
      const route = routes.find(candidate => candidate.path === path)
      expect(route).withContext(`route ${path}`).toBeDefined()
      expect(routePolicyOf(route!)).withContext(`route ${path}`).toEqual({ access, shell })
    }
  })

  it('classifies parameterized URLs by their route definitions', () => {
    const cases = [
      ['/login/mfa/email', 'login/mfa/:view', 'public'],
      ['/molecules/detail/chembl-123', 'molecules/detail/:molId', 'public'],
      ['/molecules/collections/detail/collection-123', 'molecules/collections/detail/:colId', 'authenticated'],
      ['/admin/maintenance/maintenance-token', 'admin/maintenance/:token', 'public']
    ] as const

    for (const [url, path, access] of cases) {
      const route = routes.find(candidate => candidate.path === path)!
      const routeSegments = path.split('/')
      const urlSegments = url.slice(1).split('/')
      expect(urlSegments).withContext(`${url} matches ${path}`).toHaveSize(routeSegments.length)
      expect(routeSegments.every((segment, index) => segment.startsWith(':') || segment === urlSegments[index]))
        .withContext(`${url} matches ${path}`)
        .toBeTrue()
      expect(routePolicyOf(route).access).toBe(access)
    }
  })
})
