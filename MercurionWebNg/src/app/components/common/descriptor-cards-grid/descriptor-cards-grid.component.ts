import { NgClass } from '@angular/common';
import { Component, input } from '@angular/core';
import { DescriptorCardContentComponent } from '../descriptor-card-content/descriptor-card-content.component';

@Component({
  selector: 'm-descriptor-cards-grid',
  imports: [NgClass, DescriptorCardContentComponent],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      @for (data of cardsData(); track $index) {
        <div class="py-8 px-4 rounded-lg relative text-2xl font-medium" [ngClass]="{
          'bg-light-primary-accent/10 dark:bg-dark-primary/10': data.bg === 'primary',
          'bg-light-secondary-accent/10 dark:bg-dark-secondary/10': data.bg === 'secondary'
        }">
      <h2 class="text-xs font-light absolute top-1 left-1">{{ data.title }}</h2>
        <m-descriptor-card-content />
      </div>
      }
    </div>
  `,
  styles: ``,
})
export class DescriptorCardsGridComponent {

  readonly cardsData = input.required<{ title: string, bg: 'primary' | 'secondary' }[]>()

}
