import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { IconButtonComponent, IconButtonSize } from '../icon-button/icon-button.component';
import { CopyUiService } from '../../../services/copy-ui.service';
import { CopyIconStatus } from '../../../Models/copy.models';

@Component({
  selector: 'm-copy-button',
  imports: [IconButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center' },
  template: `
  <m-icon-button
    class="flex"
    [size]="size()"
    [ariaLabelledby]="ariaLabelledby()"
    [ariaDescribedby]="ariaDescribedby()"
    [ariaLabel]="ariaLabel()"
    [disabled]="disabled()"
    (pressed)="copy()">
      @switch (iconView()) {
        @case ('copy') {
          <svg class="shrink-0 size-5 text-slate-600 dark:text-slate-300" viewBox="0 0 20 20" fill="currentColor"
              aria-hidden="true">
              <path
                  d="M4 4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1h-1V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h1v1H6a2 2 0 0 1-2-2V4z" />
              <path d="M8 6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V6z" />
          </svg>
        }
        @case ('copied') {
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current shrink-0 size-5 text-light-accent-secondary dark:text-dark-accent-secondary-hc" aria-hidden="true">
            <!--!Font Awesome Pro v7.3.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2026 Fonticons, Inc.-->
            <path d="M550.5 140.5L541.1 153.4L261.1 537.4L250.1 552.5L236.9 539.3L100.9 403.3L89.6 392L112.2 369.4L123.5 380.7L246.3 503.5L515.3 134.6L524.7 121.7L550.6 140.6z"/>
          </svg>
        }
        @case ('error') {
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current shrink-0 size-5 text-light-error dark:text-dark-error-hc" aria-hidden="true">
            <!--!Font Awesome Pro v7.3.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2026 Fonticons, Inc.-->
            <path d="M507.4 155.3L518.8 144L496.1 121.4L484.8 132.7L320.1 297.4L155.4 132.7L144.1 121.4L121.5 144L132.8 155.3L297.5 320L132.8 484.7L121.5 496L144.1 518.6L155.4 507.3L320.1 342.6L484.8 507.3L496.1 518.6L518.8 496L507.4 484.7L342.8 320L507.4 155.3z"/>
          </svg>
        }
      }
  </m-icon-button>
  <span class="sr-only" role="status">{{ iconView() === 'copied' ? 'Copiato negli appunti' : '' }}</span>
  `,
})
export class CopyButtonComponent {

  private readonly ICON_STATUS_TTL = 2500

  private readonly copyUiService = inject(CopyUiService)

  readonly size = input<IconButtonSize>('md')
  readonly src = input.required<string>()
  readonly ariaLabelledby = input<string>()
  readonly ariaDescribedby = input<string>()
  readonly ariaLabel = input<string>('Copia')
  readonly disabled = input(false)

  protected readonly copyTick = signal<number>(0)
  protected readonly errorCopyTick = signal<number>(0)
  protected readonly iconView = signal<CopyIconStatus>('copy')

  private readonly copiedEfxRef = effect(() => {
    const t = this.copyTick()
    if (t > 0) {
      this.iconView.set('copied')
      setTimeout(() => {
        this.iconView.set('copy')
      }, this.ICON_STATUS_TTL)
    }
  })

  private readonly errorCopiedEfxRef = effect(() => {
    const t = this.errorCopyTick()
    if (t > 0) {
      this.iconView.set('error')
      setTimeout(() => {
        this.iconView.set('copy')
      }, this.ICON_STATUS_TTL)
    }
  })

  async copy(): Promise<void> {

    const src = this.src()

    const ok = await this.copyUiService
      .copy(src, {
        showToast: true,
        errorMessage: 'Impossibile copiare il codice. Copialo manualmente.',
        errorContext: 'error',
        durationMs: 3000,
        forceToast: false
      })

    if (ok) {
      this.copyTick.update((v) => v + 1)
    } else {
      this.errorCopyTick.update((v) => v + 1)
    }

  }
}
