import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, signal, OnInit, OnDestroy, effect } from '@angular/core';
import { PublicPipe } from '../../../pipes/public.pipe';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RDKitLoaderService } from '../../../services/rd-kit-loader.service';
import { firstValueFrom } from 'rxjs';

// Per messaging iframe <-> Angular
export type KetcherFrameMode = 'create' | 'edit' | 'duplicate';

@Component({
  selector: 'app-ketcher-frame',
  standalone: true,
  template: `
    <iframe
      #ketcherIframe
      [src]="ketcherUrl"
      style="width:100%;height:500px;border:none"
    ></iframe>
    <ng-content></ng-content>
  `
})
export class KetcherFrameComponent implements OnInit, OnDestroy {

  ketcherUrl!: SafeResourceUrl;

  @Input()
  set smiles(smiles: string | undefined) {
    if (!smiles) smiles = '';
    this._smiles.set(smiles);

    // Quando ricevi uno SMILES e Ketcher è pronto, invia il molfile
    if (this.ketcherReady()) {
      this.updateKetcherMolfile(smiles);
    }
  }

  @Input()
  mode: KetcherFrameMode = 'create';

  @Output()
  molChange = new EventEmitter<string>();
  @Output()
  exportSmiles = new EventEmitter<string>();

  _smiles = signal<string>('');
  ketcherReady = signal<boolean>(false);

  @ViewChild('ketcherIframe') iframeRef!: ElementRef<HTMLIFrameElement>;

  constructor(
    private readonly publicPipe: PublicPipe,
    private readonly sanitizer: DomSanitizer,
    private readonly rdkitLoader: RDKitLoaderService
  ) {
    const ketcherUrl = this.publicPipe.transform('ketcher/index.html');
    this.ketcherUrl = this.sanitizer.bypassSecurityTrustResourceUrl(ketcherUrl);
  }

  ngOnInit() {
    window.addEventListener('message', this.onKetcherMessage);
  }

  ngOnDestroy() {
    window.removeEventListener('message', this.onKetcherMessage);
  }

  /** Gestione eventi provenienti da Ketcher */
  private onKetcherMessage = (event: MessageEvent) => {
    if (!event.data) return;
    const { type, payload } = event.data;

    // Ketcher segnala che è pronto a ricevere messaggi
    if (type === 'ketcherReady') {
      this.ketcherReady.set(true);

      // Se c'è già uno smiles da inviare, mandalo ora
      if (this._smiles()) {
        this.updateKetcherMolfile(this._smiles());
      }
    }

    // Quando ricevi SMILES da Ketcher (in export)
    if (type === 'smiles') {
      this.exportSmiles.emit(payload);
      this.molChange.emit(payload); // compatibilità
    }
  };

  /** Permette al genitore di chiedere l'export quando vuole */
  requestExportSmiles() {
    this.postToKetcher({ type: 'getSmiles' });
  }

  /** Invia il molfile generato da uno SMILES a Ketcher */
  private async updateKetcherMolfile(smiles: string) {
    const molfile = await this.smilesToMolfile(smiles);
    if (molfile) {
      this.postToKetcher({ type: 'setMolecule', payload: molfile });
    }
  }

  /** Metodo privato di invio */
  private postToKetcher(message: any) {
    this.iframeRef?.nativeElement?.contentWindow?.postMessage(message, '*');
  }

  /** Conversione SMILES → Molfile */
  private async smilesToMolfile(smiles: string): Promise<string | undefined> {
    const RDKit = await firstValueFrom(this.rdkitLoader.instance$);
    if (!RDKit) throw new Error('RDKit non inizializzato');
    const mol = RDKit.get_mol(smiles);
    if (!mol) return undefined;
    const molfile = mol.get_molblock();
    mol.delete();
    return molfile;
  }
}
