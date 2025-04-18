import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
// Presupponiamo un RDKitLoaderService che espone getRDKit() come descritto prima.
import type { RDKitModule } from '@rdkit/rdkit';  // Tipi da RDKit.js
import { RDKitLoaderService } from '../../../services/rd-kit-loader.service';

@Component({
  selector: 'molecule-viewer',
  standalone: true,
  template: `<div class="molecule-svg" [innerHTML]="svgContent"></div>`,
  styles: [`
    .molecule-svg svg { max-width: 100%; height: auto; }
    /* Opzionale: stile dark-mode tramite :host-context o attributo */
  `]
})
export class MoleculeViewerComponent implements OnInit, OnChanges {
  @Input() structure!: string;       // SMILES, Molfile o SDF
  @Input() darkMode: boolean = false;
  svgContent: SafeHtml | null = null;
  private RDKit!: RDKitModule;
  private currentMol: any;  // RDKitModule.JSMol, usare any se tipi non disponibili

  constructor(private readonly rdkitService: RDKitLoaderService,
              private readonly sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    // Carica RDKitModule una volta sola
    this.rdkitService.instance$.subscribe(rdkit => {
      this.RDKit = rdkit;
      // Appena RDKit è pronto, genera subito l'SVG se structure già fornito
      if (this.structure) {
        this.renderMolecule();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Se cambia l’input struttura o il flag darkMode, rigenera il disegno
    if ((changes['structure'] || changes['darkMode']) && this.RDKit) {
      this.renderMolecule();
    }
  }

  private renderMolecule(): void {
    // Elimina molecola precedente se esiste
    if (this.currentMol) {
      this.currentMol.delete();
      this.currentMol = null;
    }
    if (!this.structure) {
      this.svgContent = null;
      return;
    }
    // Distinzione SDF vs singola struttura
    let molStr = this.structure;
    if (molStr.includes('$$$$')) {
      molStr = molStr.split('$$$$')[0];
    }
    // Crea la molecola RDKit
    const mol = this.RDKit.get_mol(molStr);
    if (!mol || !mol.is_valid()) {
      console.error('Struttura non valida per RDKit');
      this.svgContent = null;
      mol?.delete();
      return;
    }
    this.currentMol = mol;
    // Imposta opzioni di disegno
    const options: any = {
      bondLineWidth: 1.5,
      fixedBondLength: 30,
      clearBackground: !this.darkMode  // false in dark mode, così non disegna sfondo bianco
    };
    if (this.darkMode) {
      options.backgroundColour = [0, 0, 0];
      options.symbolColour = [1, 1, 1];
      options.legendColour = [1, 1, 1];
    }
    // Genera SVG (usiamo highlights anche se non evidenziamo atomi, per poter passare opzioni)
    const svg = mol.get_svg_with_highlights(JSON.stringify(options));
    // Post-processing per dark mode: rende bianchi eventuali elementi neri rimasti
    let svgOut = svg;
    if (this.darkMode) {
      svgOut = svgOut.replace(/stroke:#000000/g, 'stroke:#FFFFFF')
                     .replace(/fill:#000000/g, 'fill:#FFFFFF');
    }
    // Aggiorna il contenuto da visualizzare, sanitizzando l'SVG
    this.svgContent = this.sanitizer.bypassSecurityTrustHtml(svgOut);
  }
}
