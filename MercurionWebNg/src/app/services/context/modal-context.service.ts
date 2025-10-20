// modal-context.service.ts
import { Injectable, effect, signal, WritableSignal, Injector, inject, EnvironmentInjector } from '@angular/core';
import { CdkPortalOutlet, ComponentPortal, ComponentType } from '@angular/cdk/portal';
import { MODAL_DATA, MODAL_REF, ModalRef, ModalOpenOptions } from './../../modal.tokens';

@Injectable({ providedIn: 'root' })
export class ModalContextService {
  private _isOpened: WritableSignal<boolean> = signal(false);
  private _isMounted: WritableSignal<boolean> = signal(false);
  private _isVisible: WritableSignal<boolean> = signal(false);
  private _options: WritableSignal<Required<ModalOpenOptions>> =
    signal({ closeOnEsc: true, closeOnOverlay: true });

  readonly isOpened = this._isOpened.asReadonly();
  readonly isMounted = this._isMounted.asReadonly();
  readonly isVisible = this._isVisible.asReadonly();
  readonly options = this._options.asReadonly();

  private outlet?: CdkPortalOutlet;
  private parentInjector = inject(Injector);
  private envInjector = inject(EnvironmentInjector);

  // attende la registrazione dell'outlet
  private waiters: Array<(o: CdkPortalOutlet) => void> = [];
  private outletReady(): Promise<CdkPortalOutlet> {
    return this.outlet ? Promise.resolve(this.outlet)
      : new Promise(res => this.waiters.push(res));
  }

  constructor() {
    effect(() => {
      if (this.isOpened()) {
        this._isMounted.set(true);
        queueMicrotask(() => this._isVisible.set(true));
      } else {
        this._isVisible.set(false);
        setTimeout(() => this._isMounted.set(false), 300);
      }
    });
  }

  registerOutlet(outlet: CdkPortalOutlet) {
    this.outlet = outlet;
    // sveglia eventuali open partiti prima
    for (const w of this.waiters.splice(0)) w(outlet);
  }

  open<TComponent, TData = unknown, TResult = unknown>(
    component: ComponentType<TComponent>,
    data?: TData,
    opts?: ModalOpenOptions
  ) {
    const merged = { closeOnEsc: true, closeOnOverlay: true, ...opts };
    this._options.set(merged);

    let resolveFn!: (v: TResult | undefined) => void;
    const whenClosed = new Promise<TResult | undefined>(r => (resolveFn = r));

    const ref = new ModalRef<TResult>();
    ref.close = (result?: TResult) => { this.close(); resolveFn(result); };

    const childInjector = Injector.create({
      providers: [
        { provide: MODAL_REF, useValue: ref },
        { provide: MODAL_DATA, useValue: data }
      ],
      parent: this.parentInjector,
    });

    const portal = new ComponentPortal(component, null, childInjector);

    this._isOpened.set(true);

    void this.outletReady().then(o => {
      o.detach();
      o.attach(portal);
      console.debug('[Modal] attached', component.name); // debug utile
    });

    return { ref, whenClosed };
  }
  close() {
    this.outlet?.detach();
    this._isOpened.set(false);
  }
}
