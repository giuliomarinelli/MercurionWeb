import { Args, Query, Resolver } from '@nestjs/graphql'
import { MoleculeDetail } from '../models/dto/molecule-detail.gql.dtos'
import { MoleculeService } from '../services/molecule.service'
import { AuthenticatedUserId, Public } from 'src/metadata/metadata'
import { MoleculeSearchResult } from '../models/dto/molecule-search-result.cls'
import { CanonicalSmilesArgs } from '../models/dto/canonical-smiles.args.cls'
import { UUID } from 'crypto'
import { MoleculeNameByCanonicalSmilesDTO } from '../models/dto/molecule-name-by-canonical-smiles.gql.dto'



@Resolver(() => MoleculeDetail)
export class MoleculeResolver {

    constructor(
        private readonly moleculeService: MoleculeService
    ) { }

    @Public()
    @Query(() => [MoleculeDetail])
    async moleculesByMolregnos(
        @Args({ name: 'molregnos', type: () => [String] }) molregnos: string[]
    ): Promise<MoleculeDetail[]> {
        const normalizedMolregnos = molregnos.map((m) => typeof m === 'string' ? m.trim() : m)
        return this.moleculeService.getDetailsByMolregnos(normalizedMolregnos)
    }

    @Public()
    @Query(() => [MoleculeSearchResult])
    async moleculePreviewsByMolregnos(
        @Args({ name: 'molregnos', type: () => [String] }) molregnos: string[]
    ): Promise<MoleculeSearchResult[]> {
        const normalizedMolregnos = molregnos.map((m) => typeof m === 'string' ? m.trim() : m)
        return this.moleculeService.getPreviewsByMolregnos(normalizedMolregnos)
    }

    @Public()
    @Query(() => MoleculeDetail)
    async moleculeByMolregno(
        @Args('molregno', { type: () => String, nullable: true }) molregno: string
    ): Promise<MoleculeDetail | null> {
        const normalizedMolregno = typeof molregno === 'string' ? molregno.trim() : molregno
        return this.moleculeService.getDetailByMolregno(normalizedMolregno)
    }

    @Query(() => MoleculeNameByCanonicalSmilesDTO)
    async moleculeNameByCanonicalSmiles(
        @Args() csArgs: CanonicalSmilesArgs,
        @AuthenticatedUserId() userId: UUID
    ): Promise<MoleculeNameByCanonicalSmilesDTO> {
        const normalizedCanonicalSmiles = typeof csArgs.canonicalSmiles === 'string' ? csArgs.canonicalSmiles.trim() : csArgs.canonicalSmiles
        return this.moleculeService.getMoleculeName(normalizedCanonicalSmiles, userId)
    }
    
    @Query(() => MoleculeNameByCanonicalSmilesDTO)
    async moleculeNameByCanonicalSmilesPublic(
        @Args() csArgs: CanonicalSmilesArgs        
    ): Promise<MoleculeNameByCanonicalSmilesDTO> {
        const normalizedCanonicalSmiles = typeof csArgs.canonicalSmiles === 'string' ? csArgs.canonicalSmiles.trim() : csArgs.canonicalSmiles
        return this.moleculeService.getMoleculeName(normalizedCanonicalSmiles)
    }

}
