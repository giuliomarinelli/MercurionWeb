import { Routes } from '@angular/router'
import { AuthGuard } from './guards/auth-guard.guard'

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: '',
    loadComponent: () => import('./components/common/redirect-to-login-component/redirect-to-login.component')
      .then((m) => m.RedirectToLoginComponent)
  },
  {
    path: 'login',
    title: 'Login',
    loadComponent: () => import('./pages/login/login.page.component').then(m => m.LoginPageComponent)
  },
  {
    path: 'dashboard',
    title: 'Dashboard',
    loadComponent: () => import('./pages/profile/dashboard.page.component').then(m => m.DashboardPageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'login/mfa',
    title: 'Login · MFA',
    loadComponent: () => import('./pages/login/mfa/mfa.page.component').then(m => m.MfaPageComponent)
  },
  {
    path: 'login/mfa/:view',
    title: 'Login · MFA',
    loadComponent: () => import('./pages/login/mfa/mfa.page.component').then(m => m.MfaPageComponent)
  },
  {
    path: 'molecules/detail/:molId',
    title: 'Molecole · Dettaglio',
    data: {
      titleManagedByComponent: true
    },
    loadComponent: () => import('./pages/molecule-detail/molecule-detail.page.component')
      .then(m => m.MoleculeDetailPageComponent)
  },
  {
    path: 'molecules/editor',
    title: 'Molecole · Editor',
    loadComponent: () => import('./pages/molecule-editor/molecule-editor.page.component')
      .then(m => m.MoleculeEditorPageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'molecules/collections',
    title: 'Molecole · Collezioni',
    loadComponent: () => import('./pages/my-molecule-collections/my-molecule-collections.page.component')
      .then(m => m.MyMoleculeCollectionsPageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'molecules/collections/detail/:colId',
    title: 'Molecole · Dettaglio collezione',
    data: {
      titleManagedByComponent: true
    },
    loadComponent: () => import('./pages/molecule-collection-detail/molecule-collection-detail.page.component')
      .then(m => m.MoleculeCollectionDetailPageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'settings',
    title: 'Impostazioni',
    loadComponent: () => import('./pages/settings/settings.page.component').then(m => m.SettingsPageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'help',
    title: 'Help',
    loadComponent: () => import('./pages/help/help.page.component').then(m => m.HelpPageComponent),
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
    loadComponent: () => import('./pages/not-found-404-landing/not-found-404-landing.page.component')
      .then(m => m.NotFound404LandingPageComponent)
  },
  {
    path: '403-forbidden',
    title: '403 Accesso negato',
    loadComponent: () => import('./pages/forbidden-403-landing/forbidden-403-landing.page.component')
      .then(m => m.Forbidden403LandingPageComponent)
  },
  {
    path: '**',
    redirectTo: '/404-not-found'
  }
]
