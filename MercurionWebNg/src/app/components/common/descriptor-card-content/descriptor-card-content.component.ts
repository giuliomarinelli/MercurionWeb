import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'm-descriptor-card-content',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>
  `
})
export class DescriptorCardContentComponent {

}
