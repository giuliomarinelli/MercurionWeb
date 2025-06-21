import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, SimpleChanges
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RDKitLoaderService } from '../../../services/rd-kit-loader.service';
import type { RDKitModule } from '@rdkit/rdkit';

@Component({
  selector: 'molecule-viewer',
  standalone: true,
  template: `<div class="wrap" [innerHTML]="svg"></div>`,
  styles: [`
    :host { display:block; width:100%; height:100%; }
    .wrap  { width:100%; height:100%; }
    .wrap svg { width:100%; height:100%; }
  `]
})
export class MoleculeViewerComponent implements OnInit, OnChanges {

  /* -------- API -------- */
  @Input({ required: true }) structure = '';
  @Input() darkMode = false;
  @Input() disablePreview = false;
  @Output() rendered = new EventEmitter<void>();

  svg: SafeHtml | null = null;
  private ready = false;
  private RDK!: RDKitModule;

  /* -------- palette WCAG AAA -------- */
  private static readonly WCAG = {
    light: {
      bg: '#F9FAFB', bond: '#0F172A', default: '#0F172A',
      C: '#1F2937', H: '#374151',
      N: '#1E40AF', O: '#991B1B', S: '#6B2C00', P: '#581C87',
      F: '#14532D', Cl: '#065F46', Br: '#7C2D12', I: '#5B21B6'
    },
    dark: {
      bg: '#0A0A0A', bond: '#E5E7EB', default: '#E5E7EB',
      C: '#F3F4F6', H: '#D1D5DB',
      N: '#BFDBFE', O: '#FCA5A5', S: '#FCD34D', P: '#E9D5FF',
      F: '#A7F3D0', Cl: '#6EE7B7', Br: '#FCD34D', I: '#DDD6FE'
    }
  } as const;

  constructor(
    private readonly rdkit: RDKitLoaderService,
    private readonly sanitizer: DomSanitizer
  ) { }

  /* ---------- lifecycle ---------- */
  ngOnInit() { if (!this.disablePreview) this.initRdkit(); }

  ngOnChanges(ch: SimpleChanges) {
    if ('disablePreview' in ch && !this.disablePreview && !this.ready) {
      this.initRdkit();
    } else if (
      ('disablePreview' in ch && !this.disablePreview && this.ready) ||
      ((ch['structure'] || ch['darkMode']) && !this.disablePreview && this.ready)
    ) {
      this.scheduleRender();
    }
  }

  /* ---------- internals ---------- */
  private initRdkit() {
    this.rdkit.instance$.subscribe(rdk => {
      this.RDK = rdk;
      this.ready = true;
      if (!this.disablePreview) this.scheduleRender();
    });
  }

  /** sposta RDKit fuori dal paint-frame */
  private scheduleRender() {
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
    const mode = this.darkMode ? 'dark' : 'light';
    const p = MoleculeViewerComponent.WCAG[mode];
    const Z: Record<string, number> = { H: 1, C: 6, N: 7, O: 8, F: 9, S: 16, P: 15, Cl: 17, Br: 35, I: 53 };
    const def = this.rgb(p.default);
    const map: Record<number, [number, number, number]> = {} as any;
    for (let i = 1; i <= 118; i++) map[i] = def;
    for (const [sym, hex] of Object.entries(p)) {
      if (['bg', 'bond', 'default'].includes(sym)) continue;
      map[Z[sym]] = this.rgb(hex);
    }
    return map;
  }

  private renderSvg() {
    if (!this.structure) return;

    /* ─── 1. genera lo SVG grezzo da RDKit ──────────────────────────────── */
    const mol = this.RDK.get_mol(this.structure.split('$$$$')[0]);
    if (!mol?.is_valid()) { mol?.delete?.(); return; }

    const pal = MoleculeViewerComponent.WCAG[this.darkMode ? 'dark' : 'light'];

    const opts = {
      bondLineWidth: 1.6,
      fixedBondLength: this.structure.length < 40 ? 50 : 30,
      padding: 0.02,             // 2 % su tutti i lati
      clearBackground: false,
      backgroundColour: this.rgb(pal.bg),
      bondLineColour: this.rgb(pal.bond),
      atomColourPalette: this.buildAtomPalette(),
    };

    let raw = mol.get_svg_with_highlights(JSON.stringify(opts));
    mol.delete();

    /* ─── 2. CROPPING: riduce il viewBox al bounding-box effettivo ──────── */
    /* 2. Normalizza direttamente l’elemento root -------------------------------- */
    try {
      const doc = new DOMParser().parseFromString(raw, 'image/svg+xml');
      const root = doc.documentElement as unknown as SVGSVGElement;

      // 2a. Rimuovi TUTTI gli attribute width/height eventualmente presenti
      root.removeAttribute('width');
      root.removeAttribute('height');

      // 2b. Se manca il viewBox lo ricaviamo da RDKit (width/height dell’SVG grezzo)
      if (!root.hasAttribute('viewBox')) {
        const mW = raw.match(/width\s*=\s*"([\d.]+)(?:px)?"/i);
        const mH = raw.match(/height\s*=\s*"([\d.]+)(?:px)?"/i);
        if (mW && mH) root.setAttribute('viewBox', `0 0 ${mW[1]} ${mH[1]}`);
      }

      // 2c. Imposta i nuovi attributi che vogliamo SEMPRE
      root.setAttribute('width', '100%');
      root.setAttribute('height', '100%');
      root.setAttribute('preserveAspectRatio', 'xMidYMid slice');

      // 3. Serializza di nuovo
      raw = new XMLSerializer().serializeToString(root);
    } catch {
      /* se succede qualcosa usiamo comunque lo SVG originale  */
    }


    /* ─── 3. forza width/height al 100 % e aggiunge preserveAspectRatio ─── */
    /* 3. sostituisci il tag <svg …> con le nostre regole + “slice” --------- */
    raw = raw.replace(
      /<svg\b([^>]*)>/i,
      (_full, attrs) => {
        let clean = attrs
          // via qualunque width/height duplicati
          .replace(/\swidth\s*=\s*"[^"]*"/gi, '')
          .replace(/\sheight\s*=\s*"[^"]*"/gi, '')
          .trim();

        // se il parser DOM non è riuscito a mettere il viewBox lo recuperiamo qui
        const w = raw.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)/i)?.[1];
        const h = raw.match(/viewBox="0 0 \d+(?:\.\d+)? (\d+(?:\.\d+)?)/i)?.[1];
        if (!/viewBox=/i.test(clean) && w && h) {
          clean += ` viewBox="0 0 ${w} ${h}"`;
        }

        /*  **slice** riempie il box tagliando il margine in eccesso  */
        if (!/preserveAspectRatio=/i.test(clean)) {
          clean += ' preserveAspectRatio="xMidYMid slice"';
        } else {
          clean = clean.replace(/preserveAspectRatio="[^"]*"/i,
            'preserveAspectRatio="xMidYMid slice"');
        }

        return `<svg ${clean} width="100%" height="100%" style="display:block">`;
      }
    );


    /* ─── 4. fallback colori nero/bianco + grigio RDKit ─────────────────── */
    raw = raw
      .replace(/stroke:#(?:000000|ffffff)/gi, `stroke:${pal.default}`)
      .replace(/fill:#(?:000000|ffffff)/gi, `fill:${pal.default}`)
      .replace(/stroke:#E5E7EB/gi, `stroke:${pal.default}`);

    /* ─── 5. espone lo SVG e avverte il chiamante ───────────────────────── */
    this.svg = this.sanitizer.bypassSecurityTrustHtml(raw);
    this.rendered.emit();
  }




}
