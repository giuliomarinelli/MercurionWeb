import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ProgressIndicatorComponent } from '../progress-indicator/progress-indicator.component';

@Component({
  selector: 'm-button-pending-content',
  imports: [ProgressIndicatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [style.visibility]="pending() ? 'hidden' : null"><ng-content /></span>
    @if (pending()) {
      <span class="spinner"><m-progress-indicator [size]="20" /></span>
    }
  `,
  styles: `
    :host { display: inline-grid; position: relative; }
    .spinner { position: absolute; inset: 0; display: grid; place-items: center; }
  `,
})
export class ButtonPendingContentComponent {
  readonly pending = input(false);
}
