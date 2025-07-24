import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, signal, OnInit, OnDestroy, effect } from '@angular/core';
import { PublicPipe } from '../../../pipes/public.pipe';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

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
      (load)="loaded.set(true)"
    ></iframe>
    <ng-content></ng-content> <!-- Così puoi aggiungere pulsanti o altro fuori dal frame -->
  `
})
export class KetcherFrameComponent implements OnInit, OnDestroy {

  ketcherUrl!: SafeResourceUrl;

  @Input()
  molfile?: string;

  @Input()
  set smiles(smiles: string | undefined) {
    if (!smiles) smiles = ''
    this._smiles.set(smiles)
  }

  @Input()
  mode: KetcherFrameMode = 'create';

  @Output()
  molChange = new EventEmitter<string>(); // Manteniamo la compatibilità!

  @Output()
  exportSmiles = new EventEmitter<string>(); // Emit esplicito su richiesta di export

  _smiles = signal<string>('')
  loaded = signal<boolean>(false)

  @ViewChild('ketcherIframe') iframeRef!: ElementRef<HTMLIFrameElement>;
  private iframeLoaded = signal<boolean>(false);

  constructor(
    private readonly publicPipe: PublicPipe,
    private readonly sanitizer: DomSanitizer
  ) {
    const ketcherUrl = this.publicPipe.transform('ketcher/index.html');
    this.ketcherUrl = this.sanitizer.bypassSecurityTrustResourceUrl(ketcherUrl)
    effect(() => {
      this.iframeLoaded.set(true);
      // Se edit/duplicate, importa la molecola (molfile o smiles)
      console.log(this._smiles(), this.loaded())
      if (this._smiles() && this.loaded()) {
        this.postToKetcher({ type: 'loadSmiles', data: this._smiles() })
      } else if (this.molfile) {
        this.postToKetcher({ type: 'loadMolfile', data: this.molfile })
      }

    })
  }

  ngOnInit() {
    window.addEventListener('message', this.onKetcherMessage);
  }

  ngOnDestroy() {
    window.removeEventListener('message', this.onKetcherMessage);
  }



  /** Permette al genitore di chiedere l'export quando vuole */
  requestExportSmiles() {
    this.postToKetcher({ type: 'requestExportSmiles' });
  }

  /** Metodo privato di invio */
  private postToKetcher(message: any) {
    this.iframeRef?.nativeElement?.contentWindow?.postMessage(message, '*');
  }

  /** Gestione eventi provenienti da Ketcher */
  private onKetcherMessage = (event: MessageEvent) => {
    if (!event.data) return;
    // 1. Export SMILES (esplicito)
    if (event.data.type === 'exportSmiles') {
      this.exportSmiles.emit(event.data.data);
      this.molChange.emit(event.data.data); // retro-compatibile!
    }
    // 2. Altri eventi customizzati
    // if (event.data.type === 'exportMolfile') { ... }
  }
}
