import { effect, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingContextService {

  // Stato principale pubblico
  isAppLoading = signal(false)

  // Stato interno per transizione
  isMounted = signal(false)
  isVisible = signal(false)

  constructor() {
    effect(() => {
      if (this.isAppLoading()) {
        this.isMounted.set(true)
        setTimeout(() => this.isVisible.set(true), 10)
      } else {
        this.isVisible.set(false)
        setTimeout(() => this.isMounted.set(false), 300)
      }
    })
  }

  start() {
    this.isAppLoading.set(true)
  }

  stop() {
    this.isAppLoading.set(false)
  }

}
