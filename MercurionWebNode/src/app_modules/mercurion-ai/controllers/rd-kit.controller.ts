import { Body, Controller, HttpCode, HttpStatus, Post, ValidationPipe } from '@nestjs/common';
import { RDKitService } from '../services/rd-kit.service';
import type { RdkitGetMoleculePropertiesResult } from '@mercurion/rest-contracts';
import { Public } from 'src/metadata/metadata';
import { RdkitGetMoleculePropertiesDTO } from '../models/dto/rdkit/rdkit-get-molecule-properties.cls.dto';
import { RdkitToCanonicalSmilesDTO } from '../models/dto/rdkit/rdkit-canonical-smiles.dto';
import { RdkitAreSameStructureDTO } from '../models/dto/rdkit/rdkit-are-same-structures.dto';

@Controller('rdkit-api')
export class RdKitController {

    constructor(private readonly _RDKitService: RDKitService) { }

    @Public()
    @HttpCode(HttpStatus.OK)
    @Post('/get-molecule-properties')
    async getMoleculeProperties(        
        @Body(new ValidationPipe({ transform: true })) dto: RdkitGetMoleculePropertiesDTO
    ): Promise<RdkitGetMoleculePropertiesResult> {        
        return this._RDKitService.getMoleculeProperties(dto)
    }

    @Public()
    @HttpCode(HttpStatus.OK)
    @Post('/to-canonical-smiles')
    async toCanonicalSmiles(        
        @Body(new ValidationPipe({ transform: true })) dto: RdkitToCanonicalSmilesDTO
    ): Promise<string> {        
        return this._RDKitService.toCanonicalSmiles(dto)
    }

    @Public()
    @HttpCode(HttpStatus.OK)
    @Post('/are-same-structure')
    async areSameStructure(        
        @Body(new ValidationPipe({ transform: true })) dto: RdkitAreSameStructureDTO
    ): Promise<boolean> {        
        return this._RDKitService.areSameStructure(dto)
    }
}
