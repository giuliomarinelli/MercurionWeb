import { Routes } from '@angular/router'
import { AuthGuard } from './guards/auth.guard'
import { defineRoute } from './route-policy'

export const routes: Routes = [
  defineRoute({
    path: '',
    pathMatch: 'full',
    title: '',
    redirectTo: '/welcome'
  }, { access: 'public', shell: 'welcome' }),
  defineRoute({
    path: 'welcome',
    title: 'Next Generation Chemistry Platform',
    loadComponent: () => import('./pages/welcome/welcome.page.component').then((m) => m.WelcomePageComponent)
  }, { access: 'logged-out-only', shell: 'welcome' }),
  defineRoute({
    path: 'login',
    title: 'Login',
    loadComponent: () => import('./pages/login/login.page.component').then(m => m.LoginPageComponent)
  }, { access: 'logged-out-only', shell: 'standard' }),
  defineRoute({
    path: '__local/dummy-auth',
    title: 'Autenticazione dummy locale',
    loadComponent: () => import('./pages/local-dummy-auth/local-dummy-auth.page.component')
      .then(m => m.LocalDummyAuthPageComponent)
  }, { access: 'public', shell: 'standard' }),
  defineRoute({
    path: 'profile',
    redirectTo: 'dashboard'
  }, { access: 'authenticated', shell: 'standard' }),
  defineRoute({
    path: 'dashboard',
    title: 'Dashboard',
    loadComponent: () => import('./pages/profile/dashboard.page.component').then(m => m.DashboardPageComponent),
    canActivate: [AuthGuard]
  }, { access: 'authenticated', shell: 'standard' }),
  defineRoute({
    path: 'login/mfa',
    title: 'Login · MFA',
    loadComponent: () => import('./pages/login/mfa/mfa.page.component').then(m => m.MfaPageComponent)
  }, { access: 'public', shell: 'standard' }),
  defineRoute({
    path: 'login/mfa/:view',
    title: 'Login · MFA',
    loadComponent: () => import('./pages/login/mfa/mfa.page.component').then(m => m.MfaPageComponent)
  }, { access: 'public', shell: 'standard' }),
  defineRoute({
    path: 'molecules/detail/:molId',
    title: 'Molecole · Dettaglio',
    data: { titleManagedByComponent: true },
    loadComponent: () =>
      import('./pages/molecule-detail/molecule-detail.page.component')
        .then(m => m.MoleculeDetailPageComponent)
  }, { access: 'public', shell: 'standard' }),
  defineRoute({
    path: 'molecules/editor',
    title: 'Molecole · Editor',
    loadComponent: () =>
      import('./pages/molecule-editor/molecule-editor.page.component')
        .then(m => m.MoleculeEditorPageComponent),
    canActivate: [AuthGuard]
  }, { access: 'authenticated', shell: 'standard' }),
  defineRoute({
    path: 'forgot-password',
    title: 'Password · Recupero',
    loadComponent: () => import('./pages/forgot-password/forgot-password.page.component')
      .then(m => m.ForgotPasswordPageComponent)
  }, { access: 'logged-out-only', shell: 'standard' }),
  defineRoute({
    path: 'password-recovery',
    title: 'Password · Reset',
    loadComponent: () => import('./pages/password-recovery/password-recovery.page.component')
      .then(m => m.PasswordRecoveryPageComponent)
  }, { access: 'public', shell: 'standard' }),
  defineRoute({
    path: 'molecules/collections',
    title: 'Molecole · Collezioni',
    loadComponent: () =>
      import('./pages/my-molecule-collections/my-molecule-collections.page.component')
        .then(m => m.MyMoleculeCollectionsPageComponent),
    canActivate: [AuthGuard]
  }, { access: 'authenticated', shell: 'standard' }),
  defineRoute({
    path: 'molecules/collections/detail/:colId',
    title: 'Molecole · Dettaglio collezione',
    data: { titleManagedByComponent: true },
    loadComponent: () =>
      import('./pages/molecule-collection-detail/molecule-collection-detail.page.component')
        .then(m => m.MoleculeCollectionDetailPageComponent),
    canActivate: [AuthGuard]
  }, { access: 'authenticated', shell: 'standard' }),
  defineRoute({
    path: 'register',
    title: 'Registrazione',
    loadComponent: () => import('./pages/register/register.page.component').then(m => m.RegisterPageComponent)
  }, { access: 'logged-out-only', shell: 'standard' }),
  defineRoute({
    path: 'account/activate',
    title: 'Account · Attivazione',
    loadComponent: () => import('./pages/account-activate/account-activate.page.component')
      .then(m => m.AccountActivatePageComponent)
  }, { access: 'public', shell: 'standard' }),
  defineRoute({
    path: 'molecules/all-my-molecules',
    title: 'Molecole · Tutte le mie molecole',
    loadComponent: () => import('./pages/all-my-molecules/all-my-molecules.page.component')
      .then(m => m.AllMyMoleculesPageComponent),
    canActivate: [AuthGuard]
  }, { access: 'authenticated', shell: 'standard' }),
  defineRoute({
    path: 'settings',
    title: 'Impostazioni',
    loadComponent: () => import('./pages/settings/settings.page.component').then(m => m.SettingsPageComponent),
    canActivate: [AuthGuard]
  }, { access: 'authenticated', shell: 'standard' }),
  defineRoute({
    path: 'account-recovery',
    title: 'Account · Recupero',
    loadComponent: () => import('./pages/account-recovery/account-recovery.page.component')
      .then(m => m.AccountRecoveryPageComponent)
  }, { access: 'logged-out-only', shell: 'standard' }),
  defineRoute({
    path: 'oauth2/callback',
    title: 'Login · SSO Callback',
    loadComponent: () => import('./pages/sso/sso.page.component').then(m => m.SsoPageComponent)
  }, { access: 'public', shell: 'standard' }),
  defineRoute({
    path: 'help',
    title: 'Help',
    loadComponent: () => import('./pages/help/help.page.component').then(m => m.HelpPageComponent),
    canActivate: [AuthGuard]
  }, { access: 'authenticated', shell: 'standard' }),
  defineRoute({
    path: 'feedback',
    title: 'Feedback',
    loadComponent: () => import('./pages/feedback/feedback.page.component').then(m => m.FeedbackPageComponent),
    canActivate: [AuthGuard]
  }, { access: 'authenticated', shell: 'standard' }),
  defineRoute({
    path: '404-not-found',
    title: '404 Pagina non trovata',
    loadComponent: () =>
      import('./pages/not-found-404-landing/not-found-404-landing.page.component')
        .then(m => m.NotFound404LandingPageComponent)
  }, { access: 'public', shell: 'minimal' }),
  defineRoute({
    path: '403-forbidden',
    title: '403 Accesso negato',
    loadComponent: () =>
      import('./pages/forbidden-403-landing/forbidden-403-landing.page.component')
        .then(m => m.Forbidden403LandingPageComponent)
  }, { access: 'public', shell: 'minimal' }),
  defineRoute({
    path: 'privacy',
    title: 'Informativa sulla Privacy',
    loadComponent: () => import('./pages/privacy/privacy.page.component').then((m) => m.PrivacyPageComponent)
  }, { access: 'public', shell: 'standard' }),
  defineRoute({
    path: 'terms-and-policies',
    title: 'Termini di Servizio e Politica di Utilizzo Accettabile',
    loadComponent: () => import('./pages/terms-and-policies/terms-and-policies.page.component').then((m) => m.TermsAndPoliciesPageComponent)
  }, { access: 'public', shell: 'standard' }),
  defineRoute({
    path: 'contacts',
    title: 'Contatti',
    loadComponent: () => import('./pages/contacts/contacts.page.component').then((m) => m.ContactsPageComponent)
  }, { access: 'public', shell: 'standard' }),
  defineRoute({
    path: 'admin/maintenance/:token',
    loadComponent: () => import('./pages/admin-exchange-page/admin-exchange.page.component').then(m => m.AdminExchangePageComponent)
  }, { access: 'public', shell: 'standard' }),
  defineRoute({
    path: '**',
    redirectTo: '/404-not-found'
  }, { access: 'public', shell: 'minimal' })
]
