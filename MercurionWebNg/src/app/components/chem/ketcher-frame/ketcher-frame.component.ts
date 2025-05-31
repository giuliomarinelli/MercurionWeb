// ketcher-frame.component.ts
import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { PublicPipe } from '../../../pipes/public.pipe';

@Component({
  selector: 'app-ketcher-frame',
  standalone: true,
  template: `
    <iframe
      #ketcherIframe
      [src]="ketcherUrl"
      style="width:100%;height:500px;border:none"
      (load)="onIframeLoad()"
    ></iframe>
  `
})
export class KetcherFrameComponent {
  ketcherUrl!: string
  @Input() molfile?: string;
  @Output() molChange = new EventEmitter<string>();
  @ViewChild('ketcherIframe') iframeRef!: ElementRef<HTMLIFrameElement>;
  private iframeLoaded = false;

  constructor(private readonly publicPipe: PublicPipe) {
    this.ketcherUrl = this.publicPipe.transform('ketcher/index.html')
  }

  onIframeLoad() {
    this.iframeLoaded = true;
    // opzionale: postMessage per importare una molecola se serve
  }

  // ...aggiungeremo export/import via postMessage in seguito
}
