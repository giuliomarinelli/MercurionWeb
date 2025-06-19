import { Injectable, signal } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class LayoutContextService {

  // Altezza header dinamica
  private readonly _headerHeight = signal<number>(64)
  headerHeight = this._headerHeight.asReadonly()

  setHeaderHeight(px: number): void {
    this._headerHeight.set(px)
  }

  // 🔮 Future-ready: aggiunta footerHeight, viewportHeight, isMobile...
}
