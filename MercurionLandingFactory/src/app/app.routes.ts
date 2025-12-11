import { Routes } from '@angular/router';
import { Factory } from './m-factory';

export const routes: Routes = [
  {
    path: ':code',
    component: Factory
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: '404'
  }
]
