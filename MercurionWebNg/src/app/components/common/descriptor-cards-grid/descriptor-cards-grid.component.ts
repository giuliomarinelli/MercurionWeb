import { NgClass, NgTemplateOutlet } from '@angular/common'
import { ChangeDetectionStrategy, Component, input, TemplateRef } from '@angular/core'

export type DescriptorCardsGridColumns = 1 | 2 | 3 | 4
export type DescriptorCardsGridDensity = 'default' | 'compact'

@Component({
  selector: 'm-descriptor-cards-grid',
  imports: [NgClass, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="grid grid-cols-1"
      [ngClass]="{
        'gap-4': density() === 'default',
        'gap-3': density() === 'compact',
        'lg:grid-cols-2': columns() === 2,
        'lg:grid-cols-3': columns() === 3,
        'lg:grid-cols-4': columns() === 4
      }"
    >
      @for (data of cardsData(); track $index) {
        <section
          class="rounded-lg border relative min-w-0"
          [ngClass]="{
            'flex flex-col justify-center min-h-24 pt-8 pb-4 px-6 text-2xl font-medium': density() === 'default',
            'py-5 px-4 text-base font-medium': density() === 'compact',
            'bg-light-accent-primary/10 dark:bg-dark-accent-primary/10 border-light-accent-primary dark:border-dark-accent-primary': data.bg === 'primary',
            'bg-light-accent-secondary/10 dark:bg-dark-accent-secondary/10 border-light-accent-secondary dark:border-dark-accent-secondary': data.bg === 'secondary'
          }"
        >
          <h2
            class="font-light absolute left-3"
            [ngClass]="{
              'text-xs top-1': density() === 'default',
              'text-[0.68rem] top-1.5 uppercase tracking-wide text-slate-500 dark:text-slate-400': density() === 'compact'
            }"
          >
            {{ data.title }}
          </h2>

          <ng-container [ngTemplateOutlet]="data.content" />
        </section>
      }
    </div>
  `
})
export class DescriptorCardsGridComponent {
  readonly columns = input<DescriptorCardsGridColumns>(2)
  readonly density = input<DescriptorCardsGridDensity>('default')

  readonly cardsData = input.required<{
    title: string
    bg: 'primary' | 'secondary'
    content: TemplateRef<unknown>
  }[]>()
}
