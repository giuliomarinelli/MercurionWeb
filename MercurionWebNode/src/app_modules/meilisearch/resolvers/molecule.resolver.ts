import { Args, Query, Resolver } from '@nestjs/graphql'
import { MoleculeDetail } from '../Models/DTO/molecule-detail.gql.dtos'
import { MoleculeService } from '../services/molecule.service'
import { Public } from 'src/metadata/metadata'
import { MoleculeSearchResult } from '../Models/DTO/molecule-search-result.cls'


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

}
