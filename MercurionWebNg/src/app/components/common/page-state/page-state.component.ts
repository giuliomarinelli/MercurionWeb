import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import { ButtonComponent } from '../button/button.component';
import { ClassicSpinnerComponent } from '../classic-spinner/classic-spinner.component';

export type PageState<T = unknown> =
  | { kind: 'loading'; label?: string }
  | { kind: 'empty'; title?: string; message?: string }
  | { kind: 'error'; title?: string; message: string }
  | { kind: 'retry'; title?: string; message: string; actionLabel?: string }
  | { kind: 'content'; data: T };

@Component({
  selector: 'm-page-state',
  standalone: true,
  imports: [ButtonComponent, ClassicSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (state().kind) {
      @case ('loading') {
        <section
          class="m-page-state m-page-state--loading"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          @if (loadingTemplate()) {
            <ng-content select="[pageStateLoading]"></ng-content>
          } @else {
            <m-classic-spinner [ariaLabel]="loadingLabel()" />
          }
          <span class="m-page-state__sr">{{ loadingLabel() }}</span>
        </section>
      }
      @case ('empty') {
        <section class="m-page-state m-page-state--empty" role="status" aria-live="polite">
          <h2>{{ emptyStateTitle() }}</h2>
          <p>{{ emptyStateMessage() }}</p>
        </section>
      }
      @case ('error') {
        <section class="m-page-state m-page-state--error" role="alert" aria-live="assertive">
          <h2>{{ errorTitle() }}</h2>
          <p>{{ state().message }}</p>
        </section>
      }
      @case ('retry') {
        <section class="m-page-state m-page-state--retry" role="alert" aria-live="assertive">
          <h2>{{ retryStateTitle() }}</h2>
          <p>{{ state().message }}</p>
          <m-button
            type="button"
            variant="primary"
            (pressed)="retry.emit()"
          >
            {{ retryStateActionLabel() }}
          </m-button>
        </section>
      }
      @case ('content') {
        <section class="m-page-state m-page-state--content">
          <ng-content select="[pageStateContent]"></ng-content>
        </section>
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .m-page-state {
      align-items: center;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      justify-content: center;
      min-height: 8rem;
      padding: 1.5rem;
      text-align: center;
    }

    .m-page-state h2,
    .m-page-state p {
      margin: 0;
    }

    .m-page-state--error,
    .m-page-state--retry {
      color: #b91c1c;
    }

    :host-context(.dark) .m-page-state--error,
    :host-context(.dark) .m-page-state--retry {
      color: #fca5a5;
    }

    .m-page-state__sr {
      height: 1px;
      margin: -1px;
      overflow: hidden;
      position: absolute;
      width: 1px;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  `,
})
export class PageStateComponent {
  readonly state = input.required<PageState>();
  readonly loadingTemplate = input(false);
  readonly loadingLabel = input('Loading…');
  readonly emptyTitle = input('Nothing to show');
  readonly emptyMessage = input('There is no content available.');
  readonly errorTitle = input('Something went wrong');
  readonly retryTitle = input('Unable to load content');
  readonly retryActionLabel = input('Try again');
  readonly retry = output<void>();

  protected emptyStateTitle(): string {
    const state = this.state();
    return state.kind === 'empty' && state.title ? state.title : this.emptyTitle();
  }

  protected emptyStateMessage(): string {
    const state = this.state();
    return state.kind === 'empty' && state.message ? state.message : this.emptyMessage();
  }

  protected retryStateTitle(): string {
    const state = this.state();
    return state.kind === 'retry' && state.title ? state.title : this.retryTitle();
  }

  protected retryStateActionLabel(): string {
    const state = this.state();
    return state.kind === 'retry' && state.actionLabel
      ? state.actionLabel
      : this.retryActionLabel();
  }
}
