import { NgClass, NgTemplateOutlet } from '@angular/common';
import { Component, input, TemplateRef } from '@angular/core';

@Component({
  selector: 'm-descriptor-cards-grid',
  imports: [NgClass, NgTemplateOutlet],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      @for (data of cardsData(); track $index) {
        <div class="py-8 px-4 rounded-lg border relative text-2xl font-medium" [ngClass]="{
          'bg-light-accent-primary/10 dark:bg-dark-accent-primary/10 border-light-accent-primary dark:border-dark-accent-primary': data.bg === 'primary',
          'bg-light-accent-secondary/10 dark:bg-dark-accent-secondary/10 border-light-accent-secondary dark:border-dark-accent-secondary': data.bg === 'secondary'
        }">
      <h2 class="text-xs font-light absolute top-1 left-1">{{ data.title }}</h2>
        <ng-container [ngTemplateOutlet]="data.content" />
      </div>
      }
    </div>
  `,
  styles: ``,
})
export class DescriptorCardsGridComponent {

  readonly cardsData = input.required<{
    title: string,
    bg: 'primary' | 'secondary',
    content: TemplateRef<unknown>
  }[]>()

}
