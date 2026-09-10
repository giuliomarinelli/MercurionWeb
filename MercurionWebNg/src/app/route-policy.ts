import { ActivatedRouteSnapshot, Data, Route } from '@angular/router'

export type RouteAccess = 'public' | 'authenticated' | 'logged-out-only'
export type RouteShell = 'standard' | 'welcome' | 'minimal'

export interface RoutePolicy {
  readonly access: RouteAccess
  readonly shell: RouteShell
}

export interface AppRouteData extends Data {
  readonly routePolicy: RoutePolicy
  readonly titleManagedByComponent?: boolean
}

export const DEFAULT_ROUTE_POLICY: RoutePolicy = Object.freeze({
  access: 'authenticated',
  shell: 'standard'
})

export function defineRoute(
  route: Omit<Route, 'data'> & { data?: Omit<AppRouteData, 'routePolicy'> },
  policy: RoutePolicy
): Route {
  return {
    ...route,
    data: {
      ...route.data,
      routePolicy: policy
    } satisfies AppRouteData
  }
}

export function routePolicyOf(route: Pick<Route, 'data'> | Pick<ActivatedRouteSnapshot, 'data'>): RoutePolicy {
  const policy = route.data?.['routePolicy']
  return isRoutePolicy(policy) ? policy : DEFAULT_ROUTE_POLICY
}

export function activeRoutePolicy(snapshot: ActivatedRouteSnapshot): RoutePolicy {
  let current = snapshot
  while (current.firstChild) {
    current = current.firstChild
  }
  return routePolicyOf(current)
}

function isRoutePolicy(value: unknown): value is RoutePolicy {
  if (!value || typeof value !== 'object') return false
  const policy = value as Partial<RoutePolicy>
  return (
    (policy.access === 'public' ||
      policy.access === 'authenticated' ||
      policy.access === 'logged-out-only') &&
    (policy.shell === 'standard' ||
      policy.shell === 'welcome' ||
      policy.shell === 'minimal')
  )
}
