import { Routes } from '@angular/router'
import { ColorPaletteComponent } from './playground/color-palette/color-palette.component'
import { HeaderComponent } from './components/common/header/header.component'

export const routes: Routes = [
  {
    path: 'palette',
    component: ColorPaletteComponent
  }
]
