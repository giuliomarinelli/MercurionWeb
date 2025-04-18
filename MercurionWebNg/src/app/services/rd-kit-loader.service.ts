// rdkit-loader.service.ts
import { Injectable } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import type { RDKitModule } from '@rdkit/rdkit';

@Injectable({ providedIn: 'root' })
export class RDKitLoaderService {
  private readonly rdkit$: Observable<RDKitModule> = defer(async () => {
    // se l’istanza esiste già la ri‑usa
    if (window.RDKit) return Promise.resolve(window.RDKit);

    // altrimenti lancia il bootstrap
    const m = await window
      .initRDKitModule({
        locateFile: () => '/RDKit_minimal.wasm', // stesso path impostato in angular.json
      });
    return (window.RDKit = m); // memorizza per le prossime chiamate
  }).pipe(shareReplay({ bufferSize: 1, refCount: false }));

  /** Observable singleton */
  get instance$(): Observable<RDKitModule> {
    return this.rdkit$;
  }
}
