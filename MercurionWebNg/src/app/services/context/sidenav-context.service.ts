import { Injectable, OnDestroy, signal } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class SidenavContextService implements OnDestroy {
  /** stato logico */
  private readonly _open = signal(true);

  /** derivati per la view */
  readonly isMounted = signal(true);
  readonly isVisible = signal(true);

  // Timer + generation tracciati cosi' un toggle rapido puo' annullare
  // deterministicamente il timer residuo del toggle precedente invece di
  // lasciarlo scattare in una race condition (es. riapre subito dopo
  // averlo chiuso: il vecchio timer "visible=true"/"mounted=false" non deve
  // piu' scattare).
  private transitionTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;

  private applyTransition(open: boolean): void {
    const generation = ++this.generation;
    clearTimeout(this.transitionTimeoutId);

    if (open) {
      this.isMounted.set(true);
      this.transitionTimeoutId = setTimeout(() => {
        if (generation === this.generation) this.isVisible.set(true);
      });
    } else {
      this.isVisible.set(false);
      this.transitionTimeoutId = setTimeout(() => {
        if (generation === this.generation) this.isMounted.set(false);
      }, 200);
    }
  }

  /** API pubblico */
  readonly isOpen = this._open.asReadonly()
  open() {
    this._open.set(true)
    this.applyTransition(true)
  }
  close() {
    this._open.set(false)
    this.applyTransition(false)
  }
  toggle() {
    const next = !this._open()
    this._open.set(next)
    this.applyTransition(next)
  }

  ngOnDestroy(): void {
    clearTimeout(this.transitionTimeoutId);
  }
}