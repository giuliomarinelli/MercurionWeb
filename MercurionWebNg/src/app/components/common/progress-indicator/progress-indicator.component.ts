import { ChangeDetectionStrategy, Component, computed, input, numberAttribute } from '@angular/core';

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
      [class.m-progress-indicator--labeled]="cleanLabel()"
      [style.width.px]="cleanLabel() ? null : numericSize()"
      [style.height.px]="cleanLabel() ? null : numericSize()"
      role="status"
      aria-busy="true"
      [attr.aria-label]="effectiveLabel()"
      aria-live="polite"
    >
      <svg class="m-progress-indicator__svg" [attr.width]="resolvedSize()" [attr.height]="resolvedSize()" viewBox="0 0 50 50" aria-hidden="true" focusable="false">
        <circle class="m-progress-indicator__track" cx="25" cy="25" r="20" [attr.stroke-width]="stroke()" [style.stroke]="arcStroke()" fill="none" />
        <circle class="m-progress-indicator__arc" cx="25" cy="25" r="20" [attr.stroke-width]="stroke()" [style.stroke]="arcStroke()" fill="none" stroke-linecap="round" />
      </svg>
      @if (cleanLabel(); as visibleLabel) {
        <span class="m-progress-indicator__label">{{ visibleLabel }}</span>
      }
      <span class="m-progress-indicator__sr">{{ effectiveLabel() }}</span>
    </span>
  `,
  styles: [`
    :host { display: inline-block; line-height: 0; }
    .m-progress-indicator {
      color: currentColor;
      display: inline-grid;
      gap: .625rem;
      justify-items: center;
      line-height: 1;
      position: relative;
    }
    .m-progress-indicator--sm { height: 1rem; width: 1rem; }
    .m-progress-indicator--md { height: 1.5rem; width: 1.5rem; }
    .m-progress-indicator--lg { height: 3.75rem; width: 3.75rem; }
    .m-progress-indicator--labeled { height: auto; width: auto; }
    .m-progress-indicator--overlay {
      inset: 0;
      position: absolute;
      display: grid;
      place-items: center;
      align-content: center;
      background: transparent;
      pointer-events: none;
    }
    .m-progress-indicator__label {
      color: currentColor;
      font-size: .875rem;
      font-weight: 500;
      line-height: 1.25;
      text-align: center;
      white-space: normal;
    }
    .m-progress-indicator__svg {
      animation: m-progress-indicator-rotate 850ms linear infinite;
      display: block;
      transform-origin: 50% 50%;
      transform-box: fill-box;
      will-change: transform;
    }
    .m-progress-indicator__track { opacity: .15; }
    .m-progress-indicator__arc {
      animation: m-progress-indicator-arc-length 1.35s cubic-bezier(.45, 0, .55, 1) infinite alternate;
      stroke-dasharray: 18 126;
    }
    .m-progress-indicator__sr {
      clip: rect(0, 0, 0, 0);
      height: 1px;
      margin: -1px;
      overflow: hidden;
      padding: 0;
      position: absolute;
      white-space: nowrap;
      width: 1px;
      border: 0;
    }
    @keyframes m-progress-indicator-rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes m-progress-indicator-arc-length {
      from { stroke-dasharray: 18 126; }
      to { stroke-dasharray: 94 126; }
    }
    @media (prefers-reduced-motion: reduce) {
      .m-progress-indicator__svg { animation-duration: 3s; }
      .m-progress-indicator__arc { animation-duration: 2.7s; }
    }
  `],
})
export class ProgressIndicatorComponent {
  readonly size = input<ProgressIndicatorSize | number>('md');
  readonly stroke = input(3.6, { transform: numberAttribute });
  readonly color = input<string | null>(null);
  readonly label = input<string | undefined>(undefined);
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

  protected resolvedSize(): number {
    const size = this.size();
    if (typeof size === 'number') return size;
    return { sm: 16, md: 24, lg: 60 }[size];
  }

  protected readonly arcStroke = computed(() => this.color() ?? 'currentColor');
  protected readonly cleanLabel = computed(() => this.label()?.trim() ?? '');

  protected effectiveLabel(): string {
    return this.ariaLabel() ?? (this.cleanLabel() || 'Loading…');
  }
}
