import { AppRouteData, RoutePolicy } from './route-policy'

export type RouteId =
  | 'home'
  | 'welcome'
  | 'login'
  | 'dummyAuth'
  | 'profile'
  | 'dashboard'
  | 'mfa'
  | 'moleculeDetail'
  | 'moleculeEditor'
  | 'forgotPassword'
  | 'passwordRecovery'
  | 'collections'
  | 'collectionDetail'
  | 'register'
  | 'accountActivate'
  | 'myMolecules'
  | 'settings'
  | 'accountRecovery'
  | 'oauthCallback'
  | 'help'
  | 'feedback'
  | 'notFound'
  | 'forbidden'
  | 'privacy'
  | 'terms'
  | 'contacts'
  | 'adminMaintenance'
  | 'wildcard'

export interface RouteDescriptor<TParams extends Record<string, string> = Record<never, never>> {
  readonly id: RouteId
  readonly path: string
  readonly title?: string
  readonly policy: RoutePolicy
  readonly data?: Pick<AppRouteData, 'titleManagedByComponent'>
  readonly navigation?: {
    readonly group: 'features' | 'account' | 'documents'
    readonly label: string
    readonly icon: string
  }
  readonly build: (params: TParams) => string
}

type StaticDescriptor = RouteDescriptor<Record<never, never>>
type ParamDescriptor<T extends Record<string, string>> = RouteDescriptor<T>

const staticRoute = (
  id: RouteId,
  path: string,
  title: string | undefined,
  policy: RoutePolicy,
  options: Partial<Pick<StaticDescriptor, 'data' | 'navigation'>> = {}
): StaticDescriptor => ({
  id,
  path,
  title,
  policy,
  ...options,
  build: () => `/${path}`
})

const parameterizedRoute = <T extends Record<string, string>>(
  id: RouteId,
  path: string,
  title: string,
  policy: RoutePolicy,
  parameters: readonly (keyof T)[],
  options: Partial<Pick<ParamDescriptor<T>, 'data' | 'navigation'>> = {}
): ParamDescriptor<T> => ({
  id,
  path,
  title,
  policy,
  ...options,
  build: (params: T) => `/${path.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
    const value = params[key as keyof T]
    if (typeof value !== 'string' || !value) {
      throw new Error(`Missing route parameter "${key}" for ${id}`)
    }
    return encodeURIComponent(value)
  })}`
})

export const routeManifest = {
  home: staticRoute('home', '', undefined, { access: 'public', shell: 'welcome' }),
  welcome: staticRoute('welcome', 'welcome', 'Next Generation Chemistry Platform', { access: 'logged-out-only', shell: 'welcome' }),
  login: staticRoute('login', 'login', 'Login', { access: 'logged-out-only', shell: 'standard' }),
  dummyAuth: staticRoute('dummyAuth', '__local/dummy-auth', 'Autenticazione dummy locale', { access: 'public', shell: 'standard' }),
  profile: staticRoute('profile', 'profile', undefined, { access: 'authenticated', shell: 'standard' }),
  dashboard: staticRoute('dashboard', 'dashboard', 'Dashboard', { access: 'authenticated', shell: 'standard' }),
  mfa: staticRoute('mfa', 'login/mfa', 'Login · MFA', { access: 'public', shell: 'standard' }),
  moleculeDetail: parameterizedRoute<{ molId: string }>('moleculeDetail', 'molecules/detail/:molId', 'Molecole · Dettaglio', { access: 'public', shell: 'standard' }, ['molId'], { data: { titleManagedByComponent: true } }),
  moleculeEditor: staticRoute('moleculeEditor', 'molecules/editor', 'Molecole · Editor', { access: 'authenticated', shell: 'standard' }),
  forgotPassword: staticRoute('forgotPassword', 'forgot-password', 'Password · Recupero', { access: 'logged-out-only', shell: 'standard' }),
  passwordRecovery: staticRoute('passwordRecovery', 'password-recovery', 'Password · Reset', { access: 'public', shell: 'standard' }),
  collections: staticRoute('collections', 'molecules/collections', 'Molecole · Collezioni', { access: 'authenticated', shell: 'standard' }, { navigation: { group: 'features', label: 'Le mie collezioni', icon: 'collections' } }),
  collectionDetail: parameterizedRoute<{ colId: string }>('collectionDetail', 'molecules/collections/detail/:colId', 'Molecole · Dettaglio collezione', { access: 'authenticated', shell: 'standard' }, ['colId'], { data: { titleManagedByComponent: true } }),
  register: staticRoute('register', 'register', 'Registrazione', { access: 'logged-out-only', shell: 'standard' }),
  accountActivate: staticRoute('accountActivate', 'account/activate', 'Account · Attivazione', { access: 'public', shell: 'standard' }),
  myMolecules: staticRoute('myMolecules', 'molecules/all-my-molecules', 'Molecole · Tutte le mie molecole', { access: 'authenticated', shell: 'standard' }, { navigation: { group: 'features', label: 'Le mie molecole', icon: 'molecules' } }),
  settings: staticRoute('settings', 'settings', 'Impostazioni', { access: 'authenticated', shell: 'standard' }),
  accountRecovery: staticRoute('accountRecovery', 'account-recovery', 'Account · Recupero', { access: 'logged-out-only', shell: 'standard' }),
  oauthCallback: staticRoute('oauthCallback', 'oauth2/callback', 'Login · SSO Callback', { access: 'public', shell: 'standard' }),
  help: staticRoute('help', 'help', 'Help', { access: 'authenticated', shell: 'standard' }),
  feedback: staticRoute('feedback', 'feedback', 'Feedback', { access: 'authenticated', shell: 'standard' }),
  notFound: staticRoute('notFound', '404-not-found', '404 Pagina non trovata', { access: 'public', shell: 'minimal' }),
  forbidden: staticRoute('forbidden', '403-forbidden', '403 Accesso negato', { access: 'public', shell: 'minimal' }),
  privacy: staticRoute('privacy', 'privacy', 'Informativa sulla Privacy', { access: 'public', shell: 'standard' }),
  terms: staticRoute('terms', 'terms-and-policies', 'Termini di Servizio e Politica di Utilizzo Accettabile', { access: 'public', shell: 'standard' }, { navigation: { group: 'documents', label: 'Termini e Policy', icon: 'document' } }),
  contacts: staticRoute('contacts', 'contacts', 'Contatti', { access: 'public', shell: 'standard' }),
  adminMaintenance: parameterizedRoute<{ token: string }>('adminMaintenance', 'admin/maintenance/:token', undefined as unknown as string, { access: 'public', shell: 'standard' }, ['token']),
  wildcard: staticRoute('wildcard', '**', undefined, { access: 'public', shell: 'minimal' })
} as const

export type RouteManifest = typeof routeManifest

export const routePath = <T extends RouteId>(id: T): RouteManifest[T]['path'] => routeManifest[id].path

export function routeData<T extends RouteDescriptor>(descriptor: T): AppRouteData {
  return {
    ...descriptor.data,
    routePolicy: descriptor.policy
  }
}

export function validateRouteManifest(): void {
  const descriptors = Object.values(routeManifest)
  const ids = descriptors.map(route => route.id)
  const paths = descriptors.map(route => route.path)
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate route ID in manifest')
  if (new Set(paths).size !== paths.length) throw new Error('Duplicate route path in manifest')
  for (const route of descriptors) {
    if (!route.policy || typeof route.path !== 'string' || typeof route.build !== 'function') {
      throw new Error(`Incomplete route descriptor: ${route.id}`)
    }
  }
}

validateRouteManifest()
