import { Routes } from '@angular/router'
import { AuthGuard } from './guards/auth-guard.guard'


export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page.component').then(m => m.LoginPageComponent)
  },
  {
    // redirect per retrocompatibilità
    path: 'profile',
    redirectTo: 'dashboard'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/profile/dashboard.page.component').then(m => m.DashboardPageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'login/mfa',
    loadComponent: () => import('./pages/login/mfa/mfa.page.component').then(m => m.MfaPageComponent)
  },
  {
    path: 'login/mfa/:view',
    loadComponent: () => import('./pages/login/mfa/mfa.page.component').then(m => m.MfaPageComponent)
  },
  {
    path: 'molecules/detail/:molId',
    loadComponent: () => import('./pages/molecule-detail/molecule-detail.page.component').then(m => m.MoleculeDetailPageComponent),
    canActivate: [AuthGuard]
  },
  // {
  //   path: 'notebook/:notebookId/edit',
  //   loadComponent: () => import('./pages/notebook/edit/edit.page.component').then(m => m.NotebookEditPageComponent),
  //   canActivate: [AuthGuard]
  // },
  // {
  //   path: 'notebook',
  //   loadComponent: () => import('./pages/notebook/notebook-landing/notebook-landing.component').then(m => m.NotebookLandingComponent),
  //   canActivate: [AuthGuard]
  // },
  {
    path: 'molecules/editor',
    loadComponent: () => import('./pages/molecule-editor/molecule-editor.page.component').then(m => m.MoleculeEditorPageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password/forgot-password.page.component').then(m => m.ForgotPasswordPageComponent)
  },
  {
    path: 'password-recovery',
    loadComponent: () => import('./pages/password-recovery/password-recovery.page.component').then(m => m.PasswordRecoveryPageComponent)
  },
  {
    path: 'molecules/collections',
    loadComponent: () => import('./pages/my-molecule-collections/my-molecule-collections.page.component').then(m => m.MyMoleculeCollectionsPageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'molecules/collections/detail/:colId',
    loadComponent: () => import('./pages/molecule-collection-detail/molecule-collection-detail.page.component').then(m => m.MoleculeCollectionDetailPageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page.component').then(m => m.RegisterPageComponent)
  },
  {
    path: 'account/activate',
    loadComponent: () => import('./pages/account-activate/account-activate.page.component').then(m => m.AccountActivatePageComponent)
  },
  {
    path: 'molecules/all-my-molecules',
    loadComponent: () => import('./pages/all-my-molecules/all-my-molecules.page.component').then(m => m.AllMyMoleculesPageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: '404-not-found',
    loadComponent: () => import('./pages/not-found-404-landing/not-found-404-landing.page.component').then(m => m.NotFound404LandingPageComponent)
  },
  {
    path: '403-forbidden',
    loadComponent: () => import('./pages/forbidden-403-landing/forbidden-403-landing.page.component').then(m => m.Forbidden403LandingPageComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.page.component').then(m => m.SettingsPageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'account-recovery',
    loadComponent: () => import('./pages/account-recovery/account-recovery.page.component').then(m => m.AccountRecoveryPageComponent)
  },
  {
    path: '**',
    redirectTo: '/404-not-found'
  }
]
