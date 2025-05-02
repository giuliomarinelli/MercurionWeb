import { BASE_PATH } from './../pipes/base-path.token';
import { Injectable, inject } from '@angular/core';
import { defer, from, of } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import type { RDKitModule } from '@rdkit/rdkit';

declare global { interface Window { RDKit?: RDKitModule } }

@Injectable({ providedIn: 'root' })
export class RDKitLoaderService {

  private basePath = inject(BASE_PATH)

  readonly instance$ = defer(() => {
    if (window.RDKit) return of(window.RDKit);

    // ⬇️ 1) ESM dynamic import
    // ⬇️ 2) .default perché il modulo CommonJS assegna lì l'export
    return from(
      import('@rdkit/rdkit').then(m =>
        (m as any).default({
          locateFile: () => this.basePath === '/app/' ? '/app/RDKit_minimal.wasm' : '/RDKit_minimal.wasm'
        }).then((rdk: RDKitModule | undefined) => (window.RDKit = rdk))
      )
    );
  }).pipe(shareReplay({ bufferSize: 1, refCount: false }));
}
