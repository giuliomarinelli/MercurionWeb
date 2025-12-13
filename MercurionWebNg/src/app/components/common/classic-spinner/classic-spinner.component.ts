import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'm-classic-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="app-spinner"
      role="status"
      [attr.aria-label]="ariaLabel"
      [class.app-spinner--overlay]="overlay"
    >
      <svg
        class="app-spinner__svg"
        [attr.width]="size"
        [attr.height]="size"
        viewBox="0 0 50 50"
        focusable="false"
        aria-hidden="true"
      >
        <!-- Track (opzionale, tenue) -->
        <circle
          class="app-spinner__track"
          cx="25" cy="25" r="20"
          [attr.stroke-width]="stroke"
          fill="none"
        />
        <!-- Indeterminate arc (Material-like) -->
        <circle
          class="app-spinner__arc"
          cx="25" cy="25" r="20"
          [attr.stroke-width]="stroke"
          [attr.stroke]="color || 'currentColor'"
          fill="none"
          stroke-linecap="round"
        />
      </svg>
      <span class="app-spinner__sr">{{ ariaLabel }}</span>
    </span>
  `,
  styles: [`
    :host { display: inline-block; line-height: 0; }

    .app-spinner {
      position: relative;
      color: currentColor; /* consente di ereditare dalle utility (es. Tailwind) */
    }
    .app-spinner__sr {
      position: absolute;
      width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
    }

    /* SVG rotate continuo */
    .app-spinner__svg {
      display: block;
      animation: app-spinner-rotate 2s linear infinite;
    }
    @keyframes app-spinner-rotate {
      100% { transform: rotate(360deg); }
    }

    /* Track tenue (puoi disabilitarlo settando opacity:0) */
    .app-spinner__track {
      stroke: currentColor;
      opacity: .15;
    }

    /* Arc animato tipo Material */
    .app-spinner__arc {
      stroke: currentColor;
      stroke-dasharray: 80, 200;
      stroke-dashoffset: 0;
      animation:
        app-spinner-dash 1.5s ease-in-out infinite,
        app-spinner-color 6s ease-in-out infinite;
      transform-origin: center;
    }
    @keyframes app-spinner-dash {
      0%   { stroke-dasharray: 1, 200;  stroke-dashoffset: 0;       transform: rotate(0);   }
      50%  { stroke-dasharray: 100, 200; stroke-dashoffset: -15px;  transform: rotate(135deg); }
      100% { stroke-dasharray: 1, 200;  stroke-dashoffset: -120px;  transform: rotate(450deg); }
    }
    /* opzionale: leggero respiro di colore (se usi currentColor resta identico) */
    @keyframes app-spinner-color {
      0%, 100% { opacity: 1; }
      50% { opacity: .95; }
    }

    /* Variante overlay centrata (fullscreen o contenitore posizionato) */
    .app-spinner--overlay {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      background: transparent; /* metti rgba(0,0,0,.25) se vuoi backdrop */
      pointer-events: none; /* lo spinner non blocca l’UI, rimuovi se vuoi bloccare */
    }
  `]
})
export class ClassicSpinnerComponent {
  /** dimensione in px */
  @Input() size = 40;
  /** spessore della traccia */
  @Input() stroke = 3.6;
  /** colore (default currentColor – consigliato) */
  @Input() color: string | null = null;
  /** label per a11y */
  @Input() ariaLabel = 'Caricamento…';
  /** overlay centrato (assoluto) */
  @Input() overlay = false;
}
