import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  signal,
  effect,
  NgZone,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  Subject,
  EMPTY,
  catchError,
  defer,
  firstValueFrom,
  filter,
  interval,
  take,
  takeUntil,
  tap,
  timeout,
  exhaustMap,
  of,
  Subscription,
  finalize,
} from 'rxjs';

import { PublicPipe } from '../../../pipes/public.pipe';
import { RDKitService } from '../../../services/rd-kit.service';

export type KetcherFrameMode = 'create' | 'edit' | 'duplicate';

@Component({
  selector: 'm-ketcher-frame',
  standalone: true,
  template: `
    <div class="relative w-full">
      <iframe
        #ketcherIframe
        [src]="ketcherUrl"
        class="w-full lg:px-8 h-[500px] border-none max-w-[1380px] mx-auto hidden sm:block"
      ></iframe>

      @if (loading()) {
        <div
          class="absolute inset-0 lg:inset-x-8 h-[500px] max-w-[1380px] mx-auto bg-gray-300 dark:bg-neutral-700 animate-pulse pointer-events-none hidden sm:block"
        ></div>
      }

      <div class="sm:hidden flex flex-col gap-9">
        <p class="font-semibold text-lg text-center mb-2">
          Ruota il telefono in orizzontale per usare l'editor molecolare
        </p>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 640 640"
          class="fill-current text-light-on-surface-main dark:text-slate-100 w-24 h-24 mx-auto"
        >
          <path
            d="M561.4 65.8C552.4 62.1 542.1 64.1 535.2 71L483.4 122.8C382.8 39.3 233.3 44.7 139.1 139C39.1 239 39.1 401 139.1 501C239.1 601 401.2 601 501.1 501C516 486.1 528.7 469.8 539.2 452.5C546.1 441.2 542.4 426.4 531.1 419.5C519.8 412.6 505 416.3 498.1 427.6C489.6 441.6 479.3 454.9 467.1 467C385.9 548.2 254.2 548.2 172.9 467C91.6 385.8 91.7 254.1 172.9 172.8C248.4 97.3 367.5 92 449.1 156.8L399.1 207C392.2 213.9 390.2 224.2 393.9 233.2C397.6 242.2 406.4 248 416.1 248L552.2 248C565.5 248 576.2 237.3 576.2 224L576.2 88C576.2 78.3 570.4 69.5 561.4 65.8zM528.2 145.9L528.2 200L474.1 200L528.2 145.9z"
          />
        </svg>
      </div>

      <ng-content></ng-content>
    </div>
  `,
})
export class KetcherFrameComponent implements OnInit, OnDestroy {
  ketcherUrl!: SafeResourceUrl;

  private initialSmiles = '';
  private readonly destroy$ = new Subject<void>();
  private readonly smilesResponse$ = new Subject<string>();

  private exporting = signal<boolean>(false);
  private expSub?: Subscription;

  _smiles = signal<string>('');
  _triggerReset = signal<boolean>(false);
  _triggerGetSmiles = signal<boolean>(false);

  ketcherReady = signal<boolean>(false);
  loading = signal<boolean>(true);
  loaded = signal<boolean>(false);

  @Input() mode: KetcherFrameMode = 'create';

  @Input()
  set smiles(smiles: string | undefined) {
    if (!smiles) smiles = '';
    this._smiles.set(smiles);
    this.initialSmiles = smiles;

    if (this.ketcherReady()) {
      this.updateKetcherMolfile(smiles);
    }
  }

  @Input()
  set triggerReset(trigger: boolean) {
    this._triggerReset.set(trigger);
  }

  @Input()
  set triggerGetSmiles(trigger: boolean) {
    this._triggerGetSmiles.set(trigger);
  }

  @Output() molChange = new EventEmitter<string>();
  @Output() exportSmiles = new EventEmitter<string>();
  @Output() exportPolledSmiles = new EventEmitter<string>();
  @Output() onReset = new EventEmitter<void>();

  @ViewChild('ketcherIframe') iframeRef!: ElementRef<HTMLIFrameElement>;

  constructor(
    private readonly publicPipe: PublicPipe,
    private readonly sanitizer: DomSanitizer,
    private readonly RDKit: RDKitService,
    private readonly zone: NgZone
  ) {
    const url = this.publicPipe.transform('ketcher/index.html');
    this.ketcherUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);

    // reazioni ai trigger dal parent
    effect(() => {
      if (this._triggerReset()) {
        this._triggerReset.set(false);

        if (this.ketcherReady()) {
          this.resetMolecule();
        }

        // segnala subito al parent che abbiamo fatto il reset
        this.zone.run(() => this.onReset.emit());
        return;
      }

      if (this._triggerGetSmiles()) {
        this._triggerGetSmiles.set(false);
        this.exporting.set(true);

        this.expSub = this.requestExportSmiles$('explicit')
          .pipe(
            take(1),
            finalize(() => this.exporting.set(false))
          )
          .subscribe();

        return;
      }
    });
  }

  ngOnInit(): void {
    window.addEventListener('message', this.onKetcherMessage);

    // polling "realtime" leggero
    interval(250)
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this.ketcherReady()),
        filter(() => this.loaded()),
        filter(() => !this.exporting()),
        exhaustMap(() =>
          this.requestExportSmiles$('poll').pipe(
            catchError(() => EMPTY)
          )
        )
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.onKetcherMessage);
    this.destroy$.next();
    this.destroy$.complete();
    this.expSub?.unsubscribe();
  }

  // handler messaggi dal frame Ketcher
  private onKetcherMessage = (event: MessageEvent) => {
    if (!event.data) return;
    const { type, payload } = event.data;

    this.zone.run(() => {
      if (type === 'ketcherReady') {
        this.ketcherReady.set(true);
        this.loading.set(false);

        if (this._smiles()) {
          this.updateKetcherMolfile(this._smiles());
          setTimeout(() => this.loaded.set(true), 50);
        } else {
          this.loaded.set(true);
        }

        return;
      }

      if (type === 'smiles') {
        const s = typeof payload === 'string' ? payload : '';
        this.smilesResponse$.next(s);
        return;
      }
    });
  };

  // API pubblica di comodo
  requestExportSmiles(): void {
    this.requestExportSmiles$('explicit')
      .pipe(take(1))
      .subscribe();
  }

  // richiesta SMILES a Ketcher
  private requestExportSmiles$(kind: 'explicit' | 'poll') {
    return defer(() => {
      if (!this.ketcherReady()) {
        return of('');
      }

      this.postToKetcher({ type: 'getSmiles', payload: {} });

      return this.smilesResponse$.pipe(
        take(1),
        timeout(3000),
        tap((s: string) => {
          this.zone.run(() => {
            if (kind === 'explicit') {
              this.exportSmiles.emit(s);
            } else {
              this.exportPolledSmiles.emit(s);
              this.molChange.emit(s);
            }
          });
        })
      );
    });
  }

  private async updateKetcherMolfile(smiles: string): Promise<void> {
    const molfile = await this.smilesToMolfile(smiles);
    if (molfile) {
      this.postToKetcher({ type: 'setMolecule', payload: molfile });
    }
  }

  private postToKetcher(message: any): void {
    this.iframeRef?.nativeElement?.contentWindow?.postMessage(message, '*');
  }

  private async smilesToMolfile(smiles: string): Promise<string | undefined> {
    const RDKit = await firstValueFrom(this.RDKit.instance$);
    if (!RDKit) throw new Error('RDKit non inizializzato');

    const mol = RDKit.get_mol(smiles);
    if (!mol) return undefined;

    const molfile = mol.get_molblock();
    mol.delete();
    return molfile;
  }

  resetMolecule(): void {
    if (!this.initialSmiles) this.initialSmiles = '';
    if (this.ketcherReady()) {
      this.updateKetcherMolfile(this.initialSmiles);
    }
  }
}
