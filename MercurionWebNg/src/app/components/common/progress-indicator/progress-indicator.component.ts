import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ProgressIndicatorSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'm-progress-indicator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="m-progress-indicator"
      [class.m-progress-indicator--overlay]="overlay()"
      [class.m-progress-indicator--sm]="sizeClass() === 'sm'"
      [class.m-progress-indicator--md]="sizeClass() === 'md'"
      [class.m-progress-indicator--lg]="sizeClass() === 'lg'"
      [style.width.px]="numericSize()"
      [style.height.px]="numericSize()"
      role="status"
      aria-busy="true"
      [attr.aria-label]="effectiveLabel()"
      aria-live="polite"
    >
      <svg class="m-progress-indicator__svg" viewBox="0 0 50 50" aria-hidden="true" focusable="false">
        <circle class="m-progress-indicator__track" cx="25" cy="25" r="20" />
        <circle class="m-progress-indicator__arc" cx="25" cy="25" r="20" />
      </svg>
      <span class="m-progress-indicator__sr">{{ effectiveLabel() }}</span>
    </span>
  `,
  styles: [`
    :host { display: inline-block; line-height: 0; }
    .m-progress-indicator {
      align-items: center;
      color: currentColor;
      display: inline-flex;
      justify-content: center;
      position: relative;
    }
    .m-progress-indicator--sm { height: 1rem; width: 1rem; }
    .m-progress-indicator--md { height: 1.5rem; width: 1.5rem; }
    .m-progress-indicator--lg { height: 3.75rem; width: 3.75rem; }
    .m-progress-indicator--overlay {
      inset: 0;
      position: absolute;
    }
    .m-progress-indicator__svg {
      animation: m-progress-indicator-rotate 1.8s linear infinite;
      display: block;
      height: 100%;
      width: 100%;
    }
    .m-progress-indicator__track,
    .m-progress-indicator__arc {
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-width: 3.6;
    }
    .m-progress-indicator__track { opacity: .15; }
    .m-progress-indicator__arc {
      animation: m-progress-indicator-dash 1.4s ease-in-out infinite;
      stroke-dasharray: 1, 200;
      transform-origin: center;
    }
    .m-progress-indicator__sr {
      clip: rect(0 0 0 0);
      height: 1px;
      margin: -1px;
      overflow: hidden;
      position: absolute;
      white-space: nowrap;
      width: 1px;
    }
    @keyframes m-progress-indicator-rotate { to { transform: rotate(360deg); } }
    @keyframes m-progress-indicator-dash {
      0% { stroke-dasharray: 1, 200; stroke-dashoffset: 0; }
      50% { stroke-dasharray: 100, 200; stroke-dashoffset: -15px; }
      100% { stroke-dasharray: 1, 200; stroke-dashoffset: -120px; transform: rotate(450deg); }
    }
    @media (prefers-reduced-motion: reduce) {
      .m-progress-indicator__svg,
      .m-progress-indicator__arc { animation: none; }
      .m-progress-indicator__arc { stroke-dasharray: 70, 200; }
    }
  `],
})
export class ProgressIndicatorComponent {
  readonly size = input<ProgressIndicatorSize | number>('md');
  readonly label = input('Loading…');
  readonly ariaLabel = input<string | undefined>(undefined);
  readonly overlay = input(false);

  protected sizeClass(): ProgressIndicatorSize {
    const size = this.size();
    return typeof size === 'number' ? 'md' : size;
  }

  protected numericSize(): number | null {
    const size = this.size();
    return typeof size === 'number' ? size : null;
  }

  protected effectiveLabel(): string {
    return this.ariaLabel() ?? this.label();
  }
}
