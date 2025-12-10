import { BASE_PATH } from '../pipes/base-path.token';
import { Injectable, inject } from '@angular/core';
import { defer, firstValueFrom, from, of } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import type { RDKitModule } from '@rdkit/rdkit';
import { MoleculeProperties } from '../Models/graphql/molecule-properties.model';

declare global { interface Window { RDKit?: RDKitModule } }

@Injectable({ providedIn: 'root' })
export class RDKitService {

  private basePath = inject(BASE_PATH);

  readonly instance$ = defer(() => {
    if (window.RDKit) return of(window.RDKit);

    return from(
      import('@rdkit/rdkit').then(m =>
        (m as any).default({
          locateFile: () =>
            this.basePath === '/m/'
              ? '/m/RDKit_minimal.wasm'
              : '/RDKit_minimal.wasm'
        }).then((rdk: RDKitModule | undefined) => (window.RDKit = rdk))
      )
    );
  }).pipe(shareReplay({ bufferSize: 1, refCount: false }));

  async getMoleculeProperties(smiles: string): Promise<MoleculeProperties> {
    const RDKit = await firstValueFrom(this.instance$);
    const mol = RDKit.get_mol(smiles, '{"sanitize":true,"removeHs":true}')
    if (!mol?.is_valid()) throw new Error('SMILES non valida')

    const d = JSON.parse(mol.get_descriptors());

    // 🔑  parse numeri da stringa, scartando solo NaN/∞
    const toNum = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null
    }

    const props: MoleculeProperties = {
      mwFreebase: toNum(d.amw ?? d.exactmw),   // peso molecolare
      alogp: toNum(d.CrippenClogP),       // logP
      hba: toNum(d.NumHBA),             // H‑bond acceptors
      hbd: toNum(d.NumHBD),             // H‑bond donors
      psa: toNum(d.tpsa),               // Polar Surface Area
      rtb: toNum(d.NumRotatableBonds)   // rotori liberi
    }

    mol.delete()
    return props
  }





}
