import { NotebookEditorComponent } from './pages/notebook/notebook-editor/notebook-editor.component';
import { Routes } from '@angular/router'
import { ColorPaletteComponent } from './playground/color-palette/color-palette.component'
import { AuthGuard } from './guards/auth-guard.guard'

export const routes: Routes = [
  {
    path: 'palette',
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
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'login/mfa',
    loadComponent: () => import('./pages/login/mfa/mfa.component').then(m => m.MfaComponent)
  },
  {
    path: 'login/mfa/:view',
    loadComponent: () => import('./pages/login/mfa/mfa.component').then(m => m.MfaComponent)
  },
  {
    path: 'molecules/detail/:molregno',
    loadComponent: () => import('./pages/molecule-detail/molecule-detail.component').then(m => m.MoleculeDetailComponent)
  },
  {
    path: 'notebook/list',
    loadComponent: () => import('./pages/notebook/notebook-list/notebook-list.component').then(m => m.NotebookListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'notebook/editor',
    loadComponent: () => import('./pages/notebook/notebook-editor/notebook-editor.component').then(m => m.NotebookEditorComponent)
  }

]
