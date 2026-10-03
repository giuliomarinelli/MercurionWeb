import type { PcpGetIupacNameFromSmilesDTO as PcpContract } from '@mercurion/rest-contracts';
import { RdkitGetMoleculePropertiesDTO } from './rdkit/rdkit-get-molecule-properties.cls.dto';

export class PcpGetIupacNameFromSmilesDTO extends RdkitGetMoleculePropertiesDTO implements PcpContract { }
