import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';

/**
 * ChemSpinnerComponent – v6.2 (Angular 19)
 * ---------------------------------------------------------------
 * • Spinner molecolare SVG (benzene) animato con Tailwind `animate-spin`.
 * • Overlay full‑screen opzionale (light/dark‑mode ready).
 * • Personalizzazione via prop e Tailwind utility classes.
 * • Usa la control‑flow syntax `@if / @for` **senza macro custom**.
 * ---------------------------------------------------------------
 * Esempi
 * ---------------------------------------------------------------
 * <m-chem-spinner class="w-16 h-16 text-cyan-500" />
 * <m-chem-spinner [size]="96" overlay
 *               bondClass="stroke-emerald-500"
 *               atomClass="fill-amber-400" />
 */
@Component({
  selector: 'm-chem-spinner',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (overlay()) {
      <div [class]="'fixed inset-0 z-50 grid place-items-center bg-white/60 dark:bg-black/60 ' + overlayClass()"
           role="presentation" aria-hidden="true">
        <div role="status" aria-live="polite"
             class="inline-block animate-spin"
             [class]="spinnerClass()"
             [style.width.px]="size()" [style.height.px]="size()">
          <svg class="w-full h-full" viewBox="0 0 100 100"
               xmlns="http://www.w3.org/2000/svg">
            <polygon points="50,10 86.6,30 86.6,70 50,90 13.4,70 13.4,30"
                     fill="none" stroke="currentColor" [class]="bondClass()"
                     [attr.stroke-width]="strokeWidth()" stroke-linejoin="round" />
            @for (p of points; track p) {
              <circle [attr.cx]="p.x" [attr.cy]="p.y" [attr.r]="atomRadius()"
                      fill="currentColor" [class]="atomClass()" />
            }
          </svg>
        </div>
      </div>
    } @else {
      <div role="status" aria-live="polite"
           class="inline-block animate-spin"
           [class]="spinnerClass()"
           [style.width.px]="size()" [style.height.px]="size()">
        <svg class="w-full h-full" viewBox="0 0 100 100"
             xmlns="http://www.w3.org/2000/svg">
          <polygon points="50,10 86.6,30 86.6,70 50,90 13.4,70 13.4,30"
                   fill="none" stroke="currentColor" [class]="bondClass()"
                   [attr.stroke-width]="strokeWidth()" stroke-linejoin="round" />
          @for (p of points; track p) {
            <circle [attr.cx]="p.x" [attr.cy]="p.y" [attr.r]="atomRadius()"
                    fill="currentColor" [class]="atomClass()" />
          }
        </svg>
      </div>
    }
  `,
})
export class ChemSpinnerComponent {
  /** Dimensione fallback (px) quando non si usano utilità w‑* / h‑* */
  readonly size = input(64);
  /** Classi Tailwind extra per il wrapper spinner (es. 'duration-700') */
  readonly spinnerClass = input(''
/** Abilita overlay full‑screen */
);

  /** Abilita overlay full‑screen */
  readonly overlay = input(false);
  /** Classi Tailwind extra per l'overlay (bg‑color, blur, ecc.) */
  readonly overlayClass = input(''
/** Spessore dei legami (px) */
);

  /** Spessore dei legami (px) */
  readonly strokeWidth = input(6
/** Raggio degli atomi (px) */
);
  /** Raggio degli atomi (px) */
  readonly atomRadius = input(6
/** Tailwind stroke‑* per colorare i legami */
);

  /** Tailwind stroke‑* per colorare i legami */
  readonly bondClass = input(''
/** Tailwind fill‑* per colorare gli atomi */
);
  /** Tailwind fill‑* per colorare gli atomi */
  readonly atomClass = input(''
/** Coordinate dei vertici dell'esagono benzene */
);

  /** Coordinate dei vertici dell'esagono benzene */
  readonly points = [
    { x: 50,   y: 10 },
    { x: 86.6, y: 30 },
    { x: 86.6, y: 70 },
    { x: 50,   y: 90 },
    { x: 13.4, y: 70 },
    { x: 13.4, y: 30 },
  ];
}
