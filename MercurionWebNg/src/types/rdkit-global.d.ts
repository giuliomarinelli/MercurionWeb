// src/types/rdkit-global.d.ts  (o in qualunque cartella inclusa nei "types")
import type { RDKitModule } from '@rdkit/rdkit';

declare global {
  interface Window {
    /** loader iniettato da RDKit_minimal.js */
    initRDKitModule(
      opts?: { locateFile?: () => string }
    ): Promise<RDKitModule>;

    /** istanza condivisa opzionale */
    RDKit?: RDKitModule;
  }
}
