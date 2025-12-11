import { Component } from '@angular/core';
import { LandingPage } from './landing.page';

@Component({
  selector: '#root',
  imports: [LandingPage],
  template: `
    <main class="absolute inset-0 z-50 grid min-h-full place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8 dark:bg-gray-950"></main>
  `
})
export class Root {

}
