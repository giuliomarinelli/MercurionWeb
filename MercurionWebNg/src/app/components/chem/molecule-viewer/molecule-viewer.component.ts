import {
  ApplicationRef,
  Component,
  ChangeDetectionStrategy,
  effect,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  signal,
  SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  ChemistryAdapterError,
  ChemistryRendererSession
} from '../../../chemistry/chemistry-adapter.models';
import { ChemistryRendererService } from '../../../chemistry/chemistry-renderer.service';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (renderState() === 'unavailable') {
      <div class="wrap flex flex-col items-center justify-center gap-2 text-center" role="alert">
        <span>{{ renderError() }}</span>
        <button type="button" class="underline" (click)="retry()">Riprova</button>
      </div>
    } @else {
      <div
        class="wrap"
        [innerHTML]="svg"
        role="img"
        [attr.aria-label]="ariaLabel"
        [attr.aria-busy]="renderState() === 'loading'"
      ></div>
    }
  `,
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
    '[class.detail]': 'mode === "detail"' } })
export class MoleculeViewerComponent implements OnInit, OnChanges, OnDestroy {
  /* ────── API pubblica ───────────────────────────────────────── */
  /** SMILES / MolBlock ecc. */
  @Input({ required: true }) structure = '';
  /** Palette light/dark */
  /** "preview" (default) | "detail" */
  @Input() mode: 'preview' | 'detail' = 'preview';
  /** Se true mostra solo lo skeleton (no RDKit) */
  @Input() disablePreview = false;

  /** Testo per screen reader che descrive la molecola */
  @Input() ariaLabel = 'Rappresentazione molecolare';

  @Output() rendered = new EventEmitter<void>();

  darkMode = signal<boolean>(false);
  renderState = signal<'loading' | 'ready' | 'unavailable'>('loading');
  renderError = signal('Rappresentazione molecolare non disponibile.');

  /* ────── Stato interno ─────────────────────────────────────── */
  svg: SafeHtml | null = null;
  private ready = false;
  private rendererSession?: ChemistryRendererSession;
  private rendererGeneration = 0;

  /* ────── Palette WCAG‑AAA ──────────────────────────────────── */
  private static readonly WCAG = {
    light: {
      bg: '#F9FAFB', bond: '#0F172A', default: '#0F172A',
      C: '#1F2937', H: '#374151', N: '#1E40AF', O: '#991B1B', S: '#6B2C00', P: '#581C87',
      F: '#14532D', Cl: '#065F46', Br: '#7C2D12', I: '#5B21B6' },
    dark: {
      bg: '#0A0A0A', bond: '#E5E7EB', default: '#E5E7EB',
      C: '#F3F4F6', H: '#D1D5DB', N: '#BFDBFE', O: '#FCA5A5', S: '#FCD34D', P: '#E9D5FF',
      F: '#A7F3D0', Cl: '#6EE7B7', Br: '#FCD34D', I: '#DDD6FE' } } as const;

  constructor(
    private readonly renderer: ChemistryRendererService,
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
    const generation = ++this.rendererGeneration;
    this.ready = false;
    this.renderState.set('loading');
    this.rendererSession?.dispose();
    this.rendererSession = undefined;

    void this.renderer.createSession().then(session => {
      if (this.destroyed || generation !== this.rendererGeneration) {
        session.dispose();
        return;
      }

      this.rendererSession = session;
      this.ready = true;
      if (!this.disablePreview) this.scheduleRender();
    }).catch(error => {
      if (generation === this.rendererGeneration) this.showRenderError(error);
    });
  }

  // Traccia l'unico job di render pianificato cosi' un nuovo scheduling
  // (cambio tema/struttura) annulla deterministicamente quello precedente
  // invece di lasciarli accumulare, e un componente distrutto non riceve
  // mai piu' un render idle-callback/timeout schedulato prima del destroy.
  private pendingRenderHandle: number | ReturnType<typeof setTimeout> | undefined;
  private pendingRenderIsIdleCallback = false;
  private destroyed = false;

  private scheduleRender(): void {
    this.cancelScheduledRender();

    const job = () => {
      this.pendingRenderHandle = undefined;
      if (this.destroyed) return;
      void this.renderSvg();
    };

    if ((window as any).requestIdleCallback) {
      this.pendingRenderIsIdleCallback = true;
      this.pendingRenderHandle = (window as any).requestIdleCallback(job, { timeout: 120 });
    } else {
      this.pendingRenderIsIdleCallback = false;
      this.pendingRenderHandle = setTimeout(job, 0);
    }
  }

  private cancelScheduledRender(): void {
    if (this.pendingRenderHandle === undefined) return;
    if (this.pendingRenderIsIdleCallback && (window as any).cancelIdleCallback) {
      (window as any).cancelIdleCallback(this.pendingRenderHandle);
    } else {
      clearTimeout(this.pendingRenderHandle as ReturnType<typeof setTimeout>);
    }
    this.pendingRenderHandle = undefined;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.rendererGeneration += 1;
    this.cancelScheduledRender();
    this.rendererSession?.dispose();
    this.rendererSession = undefined;
  }

  private rgb(hex: string): [number, number, number] {
    const n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  private buildAtomPalette(): Record<number, [number, number, number]> {
    const mode = this.darkMode() ? 'dark' : 'light';
    const p = MoleculeViewerComponent.WCAG[mode];
    const Z: Record<string, number> = {
      H: 1, C: 6, N: 7, O: 8, F: 9, P: 15, S: 16, Cl: 17, Br: 35, I: 53 };
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
  private async renderSvg(): Promise<void> {
    const session = this.rendererSession;
    if (!this.structure || !session) return;
    const palette = MoleculeViewerComponent.WCAG[this.darkMode() ? 'dark' : 'light'];
    let raw: string;

    try {
      raw = await session.renderSvg({
        structure: this.structure,
        options: {
          background: this.rgb(palette.bg),
          bond: this.rgb(palette.bond),
          atomPalette: this.buildAtomPalette(),
          fixedBondLength: this.structure.length < 40 ? 50 : 30
        }
      });
    } catch (error) {
      this.showRenderError(error);
      return;
    }

    if (this.destroyed || session !== this.rendererSession) return;

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
      this.renderState.set('ready');
      this.rendered.emit();
    })
  }

  retry(): void {
    this.svg = null;
    this.initRdkit();
  }

  private showRenderError(error: unknown): void {
    const message = error instanceof ChemistryAdapterError
      ? error.message
      : 'Rappresentazione molecolare non disponibile.';
    this.zone.run(() => {
      this.renderError.set(message);
      this.renderState.set('unavailable');
    });
  }
}
