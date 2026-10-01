import { Component, effect, input, signal } from '@angular/core';
import { IconButtonComponent } from '../icon-button/icon-button.component';
import { BadgeAppearanceClass } from '../../../Models/notification.models';
import { NgClass } from '@angular/common';

@Component({
  selector: 'm-notification-button',
  imports: [IconButtonComponent, NgClass],
  styles: `
    @keyframes fade-in-kf {
      from {
        opacity: 0;
      } to {
        opacity: 1;
      }
    }
    @keyframes fade-out-kf {
      from {
        opacity: 1;
      } to {
        opacity: 0;
      }
    }
    .fade-in {
      animation: fade-in-kf 0.35s forward ease-in-out;
    }
    .fade-out {
      animation: fade-out-kf 0.35s forward ease-in-out;
    }
  `,
  template: `
    <m-icon-button
      [icon]="'custom'"
      [variant]="'ghost'"
      [size]="'md'"
      [ariaLabel]="'Notifiche'"
      [ariaLabelledby]="'notification-button-label'"
    >
      <div class="relative">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current size-6 scale-130">
          <!--!Font Awesome Pro v7.3.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2026 Fonticons, Inc.-->
          <path d="M352 64L288 64L288 99.2C215 114 160 178.6 160 256L160 352L80 480L560 480L480 352L480 256C480 178.6 425 114 352 99.2L352 64zM258 528C265.1 555.6 290.2 576 320 576C349.8 576 374.9 555.6 382 528L258 528z"/>
        </svg>
        <div
          class="absolute -top-1.75 -right-0.5 w-4 h-4 rounded-full bg-light-error dark:bg-dark-error text-slate-50 dark:text-neutral-950 border-[0.5px] border-white dark:border-slate-900 flex items-center justify-center text-xs font-bold fade-in p-0.5"
          [ngClass]="[badgeClass()]">
          {{ unreadCount() }}
        </div>
      </div>
    </m-icon-button>
  `,
})
export class NotificationButtonComponent {

  private readonly FADING_DURATION = 350

  readonly unreadCount = input.required<number>()

  protected badgeClass = signal<BadgeAppearanceClass>('hidden')

  private readonly handleBadgeApppearanceEfxRef = effect(() => {
    const c = this.unreadCount()
    if (c > 0) {
      this.handleBadgeFadeIn()
    } else {
      this.handleBadgeFadeOut()
    }
  })

  private handleBadgeFadeIn(): void {
    requestAnimationFrame(() => {
      this.badgeClass.set('fade-in')
      setTimeout(() =>this.badgeClass.set(''), this.FADING_DURATION + 50)
    })
  }

  private handleBadgeFadeOut(): void {
    requestAnimationFrame(() => {
      this.badgeClass.set('fade-out')
      setTimeout(() =>this.badgeClass.set('hidden'), this.FADING_DURATION + 50)
    })
  }

}
