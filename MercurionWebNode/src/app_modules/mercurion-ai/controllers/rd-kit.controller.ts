import { Body, Controller, HttpCode, HttpStatus, Post, ValidationPipe } from '@nestjs/common';
import { RDKitService } from '../services/rd-kit.service';
import { RdkitGetMoleculePropertiesResult } from '../Models/DTO/rdkit/rdkit.res.dtos';
import { Authorization } from 'src/metadata/metadata';
import { RdkitGetMoleculePropertiesDTO } from '../Models/DTO/rdkit/rdkit-get-molecule-properties.cls.dto';
import { RdkitToCanonicalSmilesDTO } from '../Models/DTO/rdkit/rdkit-canonical-smiles.dto';
import { RdkitAreSameStructureDTO } from '../Models/DTO/rdkit/rdkit-are-same-structures.dto';

@Controller('rdkit-api')
export class RdKitController {

    constructor(private readonly _RDKitService: RDKitService) { }

    @HttpCode(HttpStatus.OK)
    @Post('/get-molecule-properties')
    async getMoleculeProperties(
        @Authorization() accessToken: string,
        @Body(new ValidationPipe({ transform: true })) dto: RdkitGetMoleculePropertiesDTO
    ): Promise<RdkitGetMoleculePropertiesResult> {
        dto.accessToken = accessToken
        return this._RDKitService.getMoleculeProperties(dto)
    }

    @HttpCode(HttpStatus.OK)
    @Post('/to-canonical-smiles')
    async toCanonicalSmiles(
        @Authorization() accessToken: string,
        @Body(new ValidationPipe({ transform: true })) dto: RdkitToCanonicalSmilesDTO
    ): Promise<string> {
        dto.accessToken = accessToken
        return this._RDKitService.toCanonicalSmiles(dto)
    }

    @HttpCode(HttpStatus.OK)
    @Post('/are-same-structure')
    async areSameStructure(
        @Authorization() accessToken: string,
        @Body(new ValidationPipe({ transform: true })) dto: RdkitAreSameStructureDTO
    ): Promise<boolean> {
        dto.accessToken = accessToken
        return this._RDKitService.areSameStructure(dto)
    }
}
