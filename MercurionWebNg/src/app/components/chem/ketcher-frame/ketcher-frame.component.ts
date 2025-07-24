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
    <div class="relative w-full">
      <!-- L'iframe c'è SEMPRE -->
      <iframe
        #ketcherIframe
        [src]="ketcherUrl"
        class="w-full md:px-8 h-[500px] border-none max-w-[1380px] mx-auto hidden sm:block"
      ></iframe>

      <!-- Loader sovrapposto: sparisce quando loading() diventa false -->
      @if (loading()) {
          <div class="absolute inset-x-8 inset-y-0 h-[500px] max-w-[1380px] mx-auto bg-gray-300 dark:bg-neutral-700 animate-pulse pointer-events-none hidden sm:block"></div>
      }
      <div class="sm:hidden flex flex-col gap-9">
      <p class="font-semibold text-lg text-center mb-2">Ruota il telefono in orizzontale per usare l'editor molecolare.</p>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current text-light-on-surface-main dark:text-slate-100 w-24 h-24 mx-auto">
          <!--!Font Awesome Pro v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path d="M561.4 65.8C552.4 62.1 542.1 64.1 535.2 71L483.4 122.8C382.8 39.3 233.3 44.7 139.1 139C39.1 239 39.1 401 139.1 501C239.1 601 401.2 601 501.1 501C516 486.1 528.7 469.8 539.2 452.5C546.1 441.2 542.4 426.4 531.1 419.5C519.8 412.6 505 416.3 498.1 427.6C489.6 441.6 479.3 454.9 467.1 467C385.9 548.2 254.2 548.2 172.9 467C91.6 385.8 91.7 254.1 172.9 172.8C248.4 97.3 367.5 92 449.1 156.8L399.1 207C392.2 213.9 390.2 224.2 393.9 233.2C397.6 242.2 406.4 248 416.1 248L552.2 248C565.5 248 576.2 237.3 576.2 224L576.2 88C576.2 78.3 570.4 69.5 561.4 65.8zM528.2 145.9L528.2 200L474.1 200L528.2 145.9z"/>
        </svg>
      </div>
      <ng-content></ng-content>
    </div>
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
  loading = signal<boolean>(true)
  loaded = signal<boolean>(false)

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
      this.loading.set(false)
      if (this._smiles()) {
        this.updateKetcherMolfile(this._smiles());
        setTimeout(() => this.loaded.set(true), 50)
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
