import { Routes } from '@angular/router'
import { AuthGuard } from './guards/auth-guard.guard'

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: '',
    loadComponent: () =>
      import('./components/common/redirect-to-login-component/redirect-to-login.component')
        .then((m) => m.RedirectToLoginComponent) // ok
  },
  {
    path: 'login',
    title: 'Login',
    loadComponent: () => import('./pages/login/login.page.component').then(m => m.LoginPageComponent) // ok
  },
  {
    // redirect per retrocompatibilità
    path: 'profile',
    redirectTo: 'dashboard'
  },
  {
    path: 'dashboard',
    title: 'Dashboard',
    loadComponent: () => import('./pages/profile/dashboard.page.component').then(m => m.DashboardPageComponent), //ok
    canActivate: [AuthGuard]
  },
  {
    path: 'login/mfa',
    title: 'Login · MFA',
    loadComponent: () => import('./pages/login/mfa/mfa.page.component').then(m => m.MfaPageComponent) // ok
  },
  {
    path: 'login/mfa/:view',
    title: 'Login · MFA',
    loadComponent: () => import('./pages/login/mfa/mfa.page.component').then(m => m.MfaPageComponent) // ok
  },

  {
    path: 'molecules/detail/:molId',
    title: 'Molecole · Dettaglio',
    data: { titleManagedByComponent: true },
    loadComponent: () =>
      import('./pages/molecule-detail/molecule-detail.page.component')
        .then(m => m.MoleculeDetailPageComponent) // ok
  },
  {
    path: 'molecules/editor',
    title: 'Molecole · Editor',
    loadComponent: () =>
      import('./pages/molecule-editor/molecule-editor.page.component')
        .then(m => m.MoleculeEditorPageComponent), //ok
    canActivate: [AuthGuard]
  },

  {
    path: 'forgot-password',
    title: 'Password · Recupero',
    loadComponent: () => import('./pages/forgot-password/forgot-password.page.component')
      .then(m => m.ForgotPasswordPageComponent) // ok
  },
  {
    path: 'password-recovery',
    title: 'Password · Reset',
    loadComponent: () => import('./pages/password-recovery/password-recovery.page.component')
      .then(m => m.PasswordRecoveryPageComponent) // ok
  },

  {
    path: 'molecules/collections',
    title: 'Molecole · Collezioni',
    loadComponent: () =>
      import('./pages/my-molecule-collections/my-molecule-collections.page.component')
        .then(m => m.MyMoleculeCollectionsPageComponent), // ok
    canActivate: [AuthGuard]
  },
  {
    path: 'molecules/collections/detail/:colId',
    title: 'Molecole · Dettaglio collezione',
    data: { titleManagedByComponent: true },
    loadComponent: () =>
      import('./pages/molecule-collection-detail/molecule-collection-detail.page.component')
        .then(m => m.MoleculeCollectionDetailPageComponent), // ok
    canActivate: [AuthGuard]
  },
  {
    path: 'register',
    title: 'Registrazione',
    loadComponent: () => import('./pages/register/register.page.component').then(m => m.RegisterPageComponent) // ok
  },
  {
    path: 'account/activate',
    title: 'Account · Attivazione',
    loadComponent: () => import('./pages/account-activate/account-activate.page.component')
      .then(m => m.AccountActivatePageComponent) // ok
  },
  {
    path: 'molecules/all-my-molecules',
    title: 'Molecole · Tutte le mie molecole',
    loadComponent: () => import('./pages/all-my-molecules/all-my-molecules.page.component')
      .then(m => m.AllMyMoleculesPageComponent), // ok
    canActivate: [AuthGuard]
  },

  {
    path: 'settings',
    title: 'Impostazioni',
    loadComponent: () => import('./pages/settings/settings.page.component').then(m => m.SettingsPageComponent), // ok
    canActivate: [AuthGuard]
  },
  {
    path: 'account-recovery',
    title: 'Account · Recupero',
    loadComponent: () => import('./pages/account-recovery/account-recovery.page.component')
      .then(m => m.AccountRecoveryPageComponent) // ok
  },
  {
    path: 'oauth2/callback',
    title: 'Login · SSO Callback',
    loadComponent: () => import('./pages/sso/sso.page.component').then(m => m.SsoPageComponent) // ok
  },
  {
    path: 'help',
    title: 'Help',
    loadComponent: () => import('./pages/help/help.page.component').then(m => m.HelpPageComponent), // ok
    canActivate: [AuthGuard]
  },
  {
    path: 'feedback',
    title: 'Feedback',
    loadComponent: () => import('./pages/feedback/feedback.page.component').then((m) => m.FeedbackPageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: '404-not-found',
    title: '404 Pagina non trovata',
    loadComponent: () =>
      import('./pages/not-found-404-landing/not-found-404-landing.page.component')
        .then(m => m.NotFound404LandingPageComponent)
  },
  {
    path: '403-forbidden',
    title: '403 Accesso negato',
    loadComponent: () =>
      import('./pages/forbidden-403-landing/forbidden-403-landing.page.component')
        .then(m => m.Forbidden403LandingPageComponent)
  },
  {
    path: 'privacy',
    title: 'Informativa sulla Privacy',
    loadComponent: () => import('./pages/privacy/privacy.page.component').then((m) => m.PrivacyPageComponent)
  },
  {
    path: 'terms-and-policies',
    title: 'Termini di Servizio e Politica di Utilizzo Accettabile',
    loadComponent: () => import('./pages/terms-and-policies/terms-and-policies.page.component').then((m) => m.TermsAndPoliciesPageComponent)
  },
  {
    path: 'contacts',
    title: 'Contatti',
    loadComponent: () => import('./pages/contacts/contacts.page.component').then((m) => m.ContactsPageComponent)
  },
  {
    path: '**',
    redirectTo: '/404-not-found'
  }
]
