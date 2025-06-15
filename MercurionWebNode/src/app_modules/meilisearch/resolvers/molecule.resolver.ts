import { Args, Query, Resolver } from '@nestjs/graphql'
import { MoleculeDetail } from '../Models/DTO/molecule-detail.gql.dtos'
import { MoleculeService } from '../services/molecule.service'
import { Public } from 'src/metadata/metadata'


@Resolver(() => MoleculeDetail)
export class MoleculeResolver {

    constructor(private readonly moleculeService: MoleculeService) { }

    @Public()
    @Query(() => [MoleculeDetail])
    async moleculesByMolregnos(
        @Args({ name: 'molregnos', type: () => [String] }) molregnos: string[]
    ): Promise<MoleculeDetail[]> {
        return this.moleculeService.getDetailsByMolregnos(molregnos)
    }


    @Public()
    @Query(() => MoleculeDetail)
    async moleculeByMolregno(
        @Args('molregno') molregno: string
    ): Promise<MoleculeDetail> {
        return this.moleculeService.getDetailByMolregno(molregno)
    }

}
