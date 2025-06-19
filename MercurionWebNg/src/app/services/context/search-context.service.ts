import { Injectable, signal, computed, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SearchContextService {
  // Stato principale pubblico
  isOpenedSearchOverlay = signal(false)

  // Stato interno per transizione
  isMounted = signal(false)
  isVisible = signal(false)

  constructor() {
    effect(() => {
      if (this.isOpenedSearchOverlay()) {
        this.isMounted.set(true)
        setTimeout(() => this.isVisible.set(true), 10)
      } else {
        this.isVisible.set(false)
        setTimeout(() => this.isMounted.set(false), 300)
      }
    })
  }

  open() {
    this.isOpenedSearchOverlay.set(true);
  }

  close() {
    this.isOpenedSearchOverlay.set(false);
  }
}
