import { Component, input } from '@angular/core';

@Component({ selector: 'bad-ui', template: '' })
export class BadUiComponent {
  readonly buttonClass = input('');
  readonly classList = input<string[]>([]);
}
