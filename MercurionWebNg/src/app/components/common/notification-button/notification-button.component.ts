import { Component, input } from '@angular/core';
import { IconButtonComponent } from '../icon-button/icon-button.component';

@Component({
  selector: 'm-notification-button',
  imports: [IconButtonComponent],
  template: `
    <m-icon-button
      [icon]="'custom'"
      [variant]="'ghost'"
      [size]="'md'"
      [ariaLabel]="'Notifiche'"
      [ariaLabelledby]="'notification-button-label'"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current size-6 scale-130">
        <!--!Font Awesome Pro v7.3.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2026 Fonticons, Inc.-->
        <path d="M352 64L288 64L288 99.2C215 114 160 178.6 160 256L160 352L80 480L560 480L480 352L480 256C480 178.6 425 114 352 99.2L352 64zM258 528C265.1 555.6 290.2 576 320 576C349.8 576 374.9 555.6 382 528L258 528z"/>
      </svg>
    </m-icon-button>
  `,
})
export class NotificationButtonComponent {

  readonly unreadCount = input.required<number>()

}
