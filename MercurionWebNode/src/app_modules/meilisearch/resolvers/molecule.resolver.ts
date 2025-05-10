import { Args, Query, Resolver } from '@nestjs/graphql'
import { MoleculeDetail } from '../Models/DTO/molecule-detail.gql.dtos'
import { MoleculeService } from '../services/molecule.service'


@Resolver(() => MoleculeDetail)
export class MoleculeResolver {

    constructor(private readonly moleculeService: MoleculeService) { }

    @Query(() => MoleculeDetail)
    async moleculeByMolregno(
        @Args('molregno') molregno: string
    ): Promise<MoleculeDetail> {
        return this.moleculeService.getDetailByMolregno(molregno)
    }

}
