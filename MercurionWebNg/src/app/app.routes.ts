import { TestSpinnerComponent } from './pages/test-spinner/test-spinner.component';
import { Routes } from '@angular/router'
import { ColorPaletteComponent } from './playground/color-palette/color-palette.component'
import { HeaderComponent } from './components/common/header/header.component'

export const routes: Routes = [
  {
    path: 'palette',
    component: ColorPaletteComponent
  },
  {
    path: 'test/spinner',
    loadComponent: () => import('./pages/test-spinner/test-spinner.component').then(m => m.TestSpinnerComponent)
  }
]
