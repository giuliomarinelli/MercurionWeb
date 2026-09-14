import { Route, Routes } from '@angular/router'
import { AuthGuard } from './guards/auth.guard'
import { routeData, routeManifest, RouteDescriptor } from './route-manifest'
import { STATUS_PAGE_CONFIG } from './pages/status-page/status-page.models'

const manifestRoute = (descriptor: RouteDescriptor<any>, route: Route = {}): Route => ({
  ...route,
  path: route.path ?? descriptor.path,
  title: route.title ?? descriptor.title,
  data: { ...routeData(descriptor), ...route.data },
})

export const routes: Routes = [
  manifestRoute(routeManifest.home, { pathMatch: 'full', redirectTo: routeManifest.welcome.build({}) }),
  manifestRoute(routeManifest.welcome, { loadComponent: () => import('./pages/welcome/welcome.page.component').then(m => m.WelcomePageComponent) }),
  manifestRoute(routeManifest.login, { loadComponent: () => import('./pages/login/login.page.component').then(m => m.LoginPageComponent) }),
  manifestRoute(routeManifest.dummyAuth, { loadComponent: () => import('./pages/local-dummy-auth/local-dummy-auth.page.component').then(m => m.LocalDummyAuthPageComponent) }),
  manifestRoute(routeManifest.profile, { redirectTo: routeManifest.dashboard.path }),
  manifestRoute(routeManifest.dashboard, { loadComponent: () => import('./pages/profile/dashboard.page.component').then(m => m.DashboardPageComponent), canActivate: [AuthGuard] }),
  manifestRoute(routeManifest.mfa, { loadComponent: () => import('./pages/login/mfa/mfa.page.component').then(m => m.MfaPageComponent) }),
  manifestRoute(routeManifest.mfa, { path: `${routeManifest.mfa.path}/:view`, loadComponent: () => import('./pages/login/mfa/mfa.page.component').then(m => m.MfaPageComponent) }),
  manifestRoute(routeManifest.moleculeDetail, { loadComponent: () => import('./pages/molecule-detail/molecule-detail.page.component').then(m => m.MoleculeDetailPageComponent) }),
  manifestRoute(routeManifest.moleculeEditor, { loadComponent: () => import('./pages/molecule-editor/molecule-editor.page.component').then(m => m.MoleculeEditorPageComponent), canActivate: [AuthGuard] }),
  manifestRoute(routeManifest.forgotPassword, { loadComponent: () => import('./pages/forgot-password/forgot-password.page.component').then(m => m.ForgotPasswordPageComponent) }),
  manifestRoute(routeManifest.passwordRecovery, { loadComponent: () => import('./pages/password-recovery/password-recovery.page.component').then(m => m.PasswordRecoveryPageComponent) }),
  manifestRoute(routeManifest.collections, { loadComponent: () => import('./pages/my-molecule-collections/my-molecule-collections.page.component').then(m => m.MyMoleculeCollectionsPageComponent), canActivate: [AuthGuard] }),
  manifestRoute(routeManifest.collectionDetail, { loadComponent: () => import('./pages/molecule-collection-detail/molecule-collection-detail.page.component').then(m => m.MoleculeCollectionDetailPageComponent), canActivate: [AuthGuard] }),
  manifestRoute(routeManifest.register, { loadComponent: () => import('./pages/register/register.page.component').then(m => m.RegisterPageComponent) }),
  manifestRoute(routeManifest.accountActivate, { loadComponent: () => import('./pages/account-activate/account-activate.page.component').then(m => m.AccountActivatePageComponent) }),
  manifestRoute(routeManifest.myMolecules, { loadComponent: () => import('./pages/all-my-molecules/all-my-molecules.page.component').then(m => m.AllMyMoleculesPageComponent), canActivate: [AuthGuard] }),
  manifestRoute(routeManifest.settings, { loadComponent: () => import('./pages/settings/settings.page.component').then(m => m.SettingsPageComponent), canActivate: [AuthGuard] }),
  manifestRoute(routeManifest.accountRecovery, { loadComponent: () => import('./pages/account-recovery/account-recovery.page.component').then(m => m.AccountRecoveryPageComponent) }),
  manifestRoute(routeManifest.oauthCallback, { loadComponent: () => import('./pages/sso/sso.page.component').then(m => m.SsoPageComponent) }),
  manifestRoute(routeManifest.help, { loadComponent: () => import('./pages/help/help.page.component').then(m => m.HelpPageComponent), canActivate: [AuthGuard] }),
  manifestRoute(routeManifest.feedback, { loadComponent: () => import('./pages/feedback/feedback.page.component').then(m => m.FeedbackPageComponent), canActivate: [AuthGuard] }),
  manifestRoute(routeManifest.notFound, { data: { statusPage: STATUS_PAGE_CONFIG[404] }, loadComponent: () => import('./pages/status-page/status-page.component').then(m => m.StatusPageComponent) }),
  manifestRoute(routeManifest.forbidden, { data: { statusPage: STATUS_PAGE_CONFIG[403] }, loadComponent: () => import('./pages/status-page/status-page.component').then(m => m.StatusPageComponent) }),
  manifestRoute(routeManifest.privacy, { loadComponent: () => import('./pages/privacy/privacy.page.component').then(m => m.PrivacyPageComponent) }),
  manifestRoute(routeManifest.terms, { loadComponent: () => import('./pages/terms-and-policies/terms-and-policies.page.component').then(m => m.TermsAndPoliciesPageComponent) }),
  manifestRoute(routeManifest.contacts, { loadComponent: () => import('./pages/contacts/contacts.page.component').then(m => m.ContactsPageComponent) }),
  manifestRoute(routeManifest.adminMaintenance, { loadComponent: () => import('./pages/admin-exchange-page/admin-exchange.page.component').then(m => m.AdminExchangePageComponent) }),
  manifestRoute(routeManifest.wildcard, { redirectTo: routeManifest.notFound.build({}) })
]
