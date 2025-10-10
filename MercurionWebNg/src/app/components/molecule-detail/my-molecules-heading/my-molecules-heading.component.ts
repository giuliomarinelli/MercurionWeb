import { Component } from '@angular/core';

@Component({
  selector: 'app-my-molecules-heading',
  imports: [],
  template: `

    <h1 class="relative bottom-4 text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left text-light-accent-secondary dark:text-dark-accent-secondary border-b border-slate-300 dark:border-slate-700 pb-6">
      Le mie molecole
    </h1>

  `
})
export class MyMoleculesHeadingComponent {

}
