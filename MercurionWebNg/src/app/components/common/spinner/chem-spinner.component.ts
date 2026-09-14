import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';

/**
 * ChemSpinnerComponent – v6.2 (Angular 19)
 * ---------------------------------------------------------------
 * • Spinner molecolare SVG (benzene) animato con Tailwind `animate-spin`.
 * • Overlay full‑screen opzionale (light/dark‑mode ready).
 * • Semantic tone variants keep styling details private to the primitive.
 * • Usa la control‑flow syntax `@if / @for` **senza macro custom**.
 * ---------------------------------------------------------------
 * Esempi
 * ---------------------------------------------------------------
 * <m-chem-spinner class="w-16 h-16 text-cyan-500" />
 * <m-chem-spinner [size]="96" overlay tone="success" />
 */
@Component({
  selector: 'm-chem-spinner',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (overlay()) {
      <div class="fixed inset-0 z-50 grid place-items-center bg-white/60 dark:bg-black/60"
           role="presentation" aria-hidden="true">
        <div role="status" aria-live="polite"
             class="inline-block animate-spin"
             [class]="toneClasses[tone()]"
             [style.width.px]="size()" [style.height.px]="size()">
          <svg class="w-full h-full" viewBox="0 0 100 100"
               xmlns="http://www.w3.org/2000/svg">
            <polygon points="50,10 86.6,30 86.6,70 50,90 13.4,70 13.4,30"
                     fill="none" stroke="currentColor" [class]="toneClasses[tone()]"
                     [attr.stroke-width]="strokeWidth()" stroke-linejoin="round" />
            @for (p of points; track p) {
              <circle [attr.cx]="p.x" [attr.cy]="p.y" [attr.r]="atomRadius()"
                      fill="currentColor" [class]="toneClasses[tone()]" />
            }
          </svg>
        </div>
      </div>
    } @else {
      <div role="status" aria-live="polite"
           class="inline-block animate-spin"
           [class]="toneClasses[tone()]"
           [style.width.px]="size()" [style.height.px]="size()">
        <svg class="w-full h-full" viewBox="0 0 100 100"
             xmlns="http://www.w3.org/2000/svg">
          <polygon points="50,10 86.6,30 86.6,70 50,90 13.4,70 13.4,30"
                   fill="none" stroke="currentColor" [class]="toneClasses[tone()]"
                   [attr.stroke-width]="strokeWidth()" stroke-linejoin="round" />
          @for (p of points; track p) {
            <circle [attr.cx]="p.x" [attr.cy]="p.y" [attr.r]="atomRadius()"
                    fill="currentColor" [class]="toneClasses[tone()]" />
          }
        </svg>
      </div>
    }
  `,
})
export class ChemSpinnerComponent {
  readonly tone = input<'default' | 'accent' | 'success' | 'warning'>('default');
  /** Dimensione fallback (px) quando non si usano utilità w‑* / h‑* */
  readonly size = input(64);
  /** Abilita overlay full‑screen */
  readonly overlay = input(false);
  /** Spessore dei legami (px) */
  readonly strokeWidth = input(6);
  /** Raggio degli atomi (px) */
  readonly atomRadius = input(6);

  /** Coordinate dei vertici dell'esagono benzene */
  readonly points = [
    { x: 50,   y: 10 },
    { x: 86.6, y: 30 },
    { x: 86.6, y: 70 },
    { x: 50,   y: 90 },
    { x: 13.4, y: 70 },
    { x: 13.4, y: 30 },
  ];

  protected readonly toneClasses = {
    default: 'text-slate-500 dark:text-slate-300',
    accent: 'text-cyan-500',
    success: 'text-emerald-500',
    warning: 'text-amber-400',
  } satisfies Record<'default' | 'accent' | 'success' | 'warning', string>;
}
