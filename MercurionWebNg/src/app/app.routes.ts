import { Routes } from '@angular/router'
import { ColorPaletteComponent } from './playground/color-palette/color-palette.component'

export const routes: Routes = [
  {
    path: 'palette',
    component: ColorPaletteComponent
  },
  {
    path: 'test/spinner',
    loadComponent: () => import('./pages/test-spinner/test-spinner.component').then(m => m.TestSpinnerComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent)
  }
]
