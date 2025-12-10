import {
  ApplicationRef,
  Component,
  effect,
  EventEmitter,
  HostBinding,
  Input,
  NgZone,
  OnChanges,
  OnInit,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RDKitService } from '../../../services/rd-kit.service';
import type { RDKitModule } from '@rdkit/rdkit';
import { ThemeManagerService } from '../../../services/context/theme-manager.service';

/**
 * <m-molecule-viewer>
 * ---------------------------------------------------------------------------
 * Un unico componente con **due varianti** d'uso:
 *   • **preview**  – thumbnail quadrato (tipicamente 48 × 48 px) che "riempie"
 *     lo spazio a disposizione (slice) mostrando il centro della molecola.
 *   • **detail**   – vista fluida / ingrandita: l'SVG scala mantenendo tutta la
 *     struttura visibile (meet) ed occupa l'altezza del contenitore mentre la
 *     larghezza si adatta automaticamente.
 *
 * Esempio d'uso:
 * ```html
 * <!-- anteprima, 48 × 48 -->
 * <m-molecule-viewer [structure]="smiles" mode="preview" class="h-12 w-12" />
 *
 * <!-- dettaglio fluido, altezza fissa 400 px -->
 * <m-molecule-viewer [structure]="smiles" mode="detail"
 *                  class="h-[400px] w-full max-w-[680px]" />
 * ```
 */

@Component({
  selector: 'm-molecule-viewer',
  standalone: true,
  template: `<div class="wrap" [innerHTML]="svg"></div>`,
  styles: [
    `:host{display:block;width:100%;height:100%}`,
    `.wrap{width:100%;height:100%}`,
    `.wrap svg{display:block}`,
    /* ---------------- Variant overrides ---------------- */
    /* detail → altezza 100%, larghezza auto  */
    `:host(.detail) .wrap svg{height:100%;width:auto}`,
    /* preview (default) → 100% su entrambi gli assi        */
    `:host(:not(.detail)) .wrap svg{height:100%;width:100%}`,
  ],
  host: {
    '[class.detail]': 'mode === "detail"',
  },
})
export class MoleculeViewerComponent implements OnInit, OnChanges {
  /* ────── API pubblica ───────────────────────────────────────── */
  /** SMILES / MolBlock ecc. */
  @Input({ required: true }) structure = '';
  /** Palette light/dark */
  /** "preview" (default) | "detail" */
  @Input() mode: 'preview' | 'detail' = 'preview';
  /** Se true mostra solo lo skeleton (no RDKit) */
  @Input() disablePreview = false;

  @Output() rendered = new EventEmitter<void>();

  darkMode = signal<boolean>(false);

  /* ────── Stato interno ─────────────────────────────────────── */
  svg: SafeHtml | null = null;
  private ready = false;
  private RDK!: RDKitModule;

  /* ────── Palette WCAG‑AAA ──────────────────────────────────── */
  private static readonly WCAG = {
    light: {
      bg: '#F9FAFB', bond: '#0F172A', default: '#0F172A',
      C: '#1F2937', H: '#374151', N: '#1E40AF', O: '#991B1B', S: '#6B2C00', P: '#581C87',
      F: '#14532D', Cl: '#065F46', Br: '#7C2D12', I: '#5B21B6',
    },
    dark: {
      bg: '#0A0A0A', bond: '#E5E7EB', default: '#E5E7EB',
      C: '#F3F4F6', H: '#D1D5DB', N: '#BFDBFE', O: '#FCA5A5', S: '#FCD34D', P: '#E9D5FF',
      F: '#A7F3D0', Cl: '#6EE7B7', Br: '#FCD34D', I: '#DDD6FE',
    },
  } as const;

  constructor(
    private readonly rdkit: RDKitService,
    private readonly sanitizer: DomSanitizer,
    private readonly appRef: ApplicationRef,
    private readonly themeManager: ThemeManagerService,
    private readonly zone: NgZone
  ) {
    effect(() => this.darkMode.set(this.themeManager.theme() === 'dark'))
    effect(() => {
      const dm = this.darkMode()
      this.scheduleRender()
    })
  }

  /* ────── Lifecycle ─────────────────────────────────────────── */
  ngOnInit(): void {
    if (!this.disablePreview) this.initRdkit();
  }

  forceReRendering(): void {
    this.appRef.tick()
  }

  ngOnChanges(ch: SimpleChanges): void {
    if ('disablePreview' in ch && !this.disablePreview && !this.ready) {
      this.initRdkit();
    } else if (!this.disablePreview && this.ready && (ch['structure'])) {
      this.scheduleRender();
    }
  }

  /* ────── Helpers ────────────────────────────────────────────── */
  private initRdkit(): void {
    this.rdkit.instance$.subscribe((rdk) => {
      this.RDK = rdk;
      this.ready = true;
      if (!this.disablePreview) this.scheduleRender();
    });
  }

  private scheduleRender(): void {
    const job = () => this.renderSvg();
    (window as any).requestIdleCallback
      ? (window as any).requestIdleCallback(job, { timeout: 120 })
      : setTimeout(job, 0);
  }

  private rgb(hex: string): [number, number, number] {
    const n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  private buildAtomPalette(): Record<number, [number, number, number]> {
    const mode = this.darkMode() ? 'dark' : 'light';
    const p = MoleculeViewerComponent.WCAG[mode];
    const Z: Record<string, number> = {
      H: 1, C: 6, N: 7, O: 8, F: 9, P: 15, S: 16, Cl: 17, Br: 35, I: 53,
    };
    const def = this.rgb(p.default);
    const palette: Record<number, [number, number, number]> = {} as any;
    for (let i = 1; i <= 118; i++) palette[i] = def;
    for (const [sym, hex] of Object.entries(p)) {
      if ((['bg', 'bond', 'default'] as const).includes(sym as any)) continue;
      palette[Z[sym]] = this.rgb(hex as string);
    }
    return palette;
  }

  /* ────── Core rendering ─────────────────────────────────────── */
  private renderSvg(): void {
    if (!this.structure || !this.RDK) return;

    /* 1. RDKit produce lo SVG grezzo */
    const mol = this.RDK.get_mol(this.structure.split('$$$$')[0])
    if (!mol) {
      return
    }
    if (!mol?.is_valid()) {
      mol?.delete?.()
      return
    }

    const palette = MoleculeViewerComponent.WCAG[this.darkMode() ? 'dark' : 'light'];
    const rdkitOpts = {
      bondLineWidth: 1.6,
      fixedBondLength: this.structure.length < 40 ? 50 : 30,
      padding: 0.02,
      clearBackground: false,
      backgroundColour: this.rgb(palette.bg),
      bondLineColour: this.rgb(palette.bond),
      atomColourPalette: this.buildAtomPalette(),
    } as const;

    let raw = mol.get_svg_with_highlights(JSON.stringify(rdkitOpts));
    mol.delete();

    /* 2. Mount off‑screen to compute exact bbox */
    try {
      const tmp = document.createElement('div');
      tmp.style.cssText = 'position:absolute;visibility:hidden;top:-9999px;left:-9999px';
      tmp.innerHTML = raw;
      document.body.appendChild(tmp);

      const svgEl = tmp.querySelector('svg') as SVGSVGElement | null;
      if (svgEl) {
        const { x, y, width: w, height: h } = svgEl.getBBox();
        const padX = w * 0.04;
        const padY = h * 0.04;
        svgEl.setAttribute('viewBox', `${x - padX} ${y - padY} ${w + 2 * padX} ${h + 2 * padY}`);
        svgEl.setAttribute('preserveAspectRatio', `xMidYMid ${this.mode === 'preview' ? 'slice' : 'meet'}`);

        /* Dimensioni responsive a seconda della variante */
        svgEl.removeAttribute('width');
        svgEl.removeAttribute('height');
        if (this.mode === 'preview') {
          svgEl.setAttribute('width', '100%');
          svgEl.setAttribute('height', '100%');
        } else {
          svgEl.setAttribute('style', 'height:100%;width:auto;display:block');
        }
        raw = svgEl.outerHTML;
      }
      document.body.removeChild(tmp);
    } catch {/* fallback: keep raw as‑is */ }

    /* 3. Fallback palette (nero / bianco RDKit) */
    raw = raw
      .replace(/stroke:#(?:000000|ffffff)/gi, `stroke:${palette.default}`)
      .replace(/fill:#(?:000000|ffffff)/gi, `fill:${palette.default}`)
      .replace(/stroke:#E5E7EB/gi, `stroke:${palette.default}`);

    /* 4. Bind al template */
    this.zone.run(() => {
      this.svg = this.sanitizer.bypassSecurityTrustHtml(raw);
      this.rendered.emit();
    })
  }
}
