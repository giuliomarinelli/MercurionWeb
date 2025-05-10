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
  }
]
