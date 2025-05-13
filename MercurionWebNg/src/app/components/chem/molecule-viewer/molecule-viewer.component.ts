import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import type { RDKitModule } from '@rdkit/rdkit';
import { RDKitLoaderService } from '../../../services/rd-kit-loader.service';

@Component({
  selector: 'molecule-viewer',
  standalone: true,
  template: `
    <div class="molecule-svg max-w-full overflow-x-auto">
      <div [innerHTML]="svgContent"></div>
    </div>
  `,
  styles: [
    `
      .molecule-svg svg {
        width: 100%;
        height: auto;
      }
    `
  ]
})
export class MoleculeViewerComponent implements OnInit, OnChanges {
  @Input() structure!: string;
  @Input() darkMode = false;

  svgContent: SafeHtml | null = null;
  private RDKit!: RDKitModule;
  private currentMol: any;

  constructor(
    private readonly rdkitService: RDKitLoaderService,
    private readonly sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.rdkitService.instance$.subscribe(rdkit => {
      this.RDKit = rdkit;
      if (this.structure) this.renderMolecule();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['structure'] || changes['darkMode']) && this.RDKit) {
      this.renderMolecule();
    }
  }

  private renderMolecule(): void {
    if (this.currentMol) {
      this.currentMol.delete();
      this.currentMol = null;
    }

    if (!this.structure) {
      this.svgContent = null;
      return;
    }

    let molStr = this.structure.includes('$$$$')
      ? this.structure.split('$$$$')[0]
      : this.structure;

    const mol = this.RDKit.get_mol(molStr);
    if (!mol || !mol.is_valid()) {
      console.error('Struttura non valida per RDKit');
      this.svgContent = null;
      mol?.delete();
      return;
    }

    this.currentMol = mol;

    const lengthFactor = molStr.length;
    const options: any = {
      bondLineWidth: 1.5,
      fixedBondLength: lengthFactor < 40 ? 50 : 30,
      clearBackground: false
    };

    if (this.darkMode) {
      options.backgroundColour = [0, 0, 0];
      options.symbolColour = [1, 1, 1];
      options.legendColour = [1, 1, 1];
    }

    let svgOut = mol.get_svg_with_highlights(JSON.stringify(options));

    svgOut = svgOut
      .replace(/<svg([^>]+)>/, '<svg$1 preserveAspectRatio="xMidYMid meet" width="100%" height="100%">')
      .replace(/width="[^\"]+"/, '')
      .replace(/height="[^\"]+"/, '');

    if (this.darkMode) {
      svgOut = svgOut.replace(/stroke:#000000/g, 'stroke:#FFFFFF')
                     .replace(/fill:#000000/g, 'fill:#FFFFFF');
    }

    this.svgContent = this.sanitizer.bypassSecurityTrustHtml(svgOut);
  }
}
