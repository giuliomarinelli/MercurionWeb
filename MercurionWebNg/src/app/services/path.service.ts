import { Injectable, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PathService {
  private readonly _path = signal<string>('')
  readonly path = this._path.asReadonly()

  constructor(router: Router) {
    // Imposta subito il path iniziale
    this._path.set(router.url)

    // Aggiorna su ogni navigazione completata
    router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this._path.set(event.urlAfterRedirects)
      })
  }
}
