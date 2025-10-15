import { Routes } from '@angular/router'
import { ColorPaletteComponent } from './playground/color-palette/color-palette.component'
import { AuthGuard } from './guards/auth-guard.guard'

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'playground/combo',
    loadComponent: () => import('./playground/combo-father/combo-father.component').then(m => m.ComboFatherComponent)
  },
  {
    path: 'playground/palette',
    component: ColorPaletteComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'test/spinner',
    loadComponent: () => import('./pages/test-spinner/test-spinner.component').then(m => m.TestSpinnerComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page.component').then(m => m.LoginPageComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.page.component').then(m => m.ProfilePageComponent),
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
    loadComponent: () => import('./pages/molecule-detail/molecule-detail.page.component').then(m => m.MoleculeDetailPageComponent)
  },
  {
    path: 'notebook/:notebookId/edit',
    loadComponent: () => import('./pages/notebook/edit/edit.page.component').then(m => m.NotebookEditPageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'notebook',
    loadComponent: () => import('./pages/notebook/notebook-landing/notebook-landing.component').then(m => m.NotebookLandingComponent),
    canActivate: [AuthGuard]
  },
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
    loadComponent: () => import('./pages/molecule-collection-detail/molecule-collection-detail.page.component').then(m => m.MoleculeCollectionDetailPageComponent)
  }
]
