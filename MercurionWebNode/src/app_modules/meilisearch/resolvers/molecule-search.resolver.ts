import { Resolver, Query, Args, ID } from '@nestjs/graphql';
import { MoleculeSearchService } from '../services/molecule-search.service';
import { MoleculeSearchResult } from '../Models/DTO/molecule-search-result.cls';
import { MoleculeSearchInput } from '../Models/DTO/molecule-search-input.cls';
import { AuthenticatedUserId, Public } from 'src/metadata/metadata';
import { UUID } from 'crypto';



@Resolver(() => MoleculeSearchResult)
export class MoleculeSearchResolver {

  constructor(private readonly moleculeSearchService: MoleculeSearchService) { }

  @Public()
  @Query(() => [MoleculeSearchResult])
  async moleculeSearch(
    @Args('input', { type: () => MoleculeSearchInput }) input: MoleculeSearchInput,
  ): Promise<MoleculeSearchResult[]> {
    return this.moleculeSearchService.searchMolecules(input)
  }

  @Query(() => [MoleculeSearchResult])
  async moleculeSearch_excludeAlreadyAdded(
    @Args('input', { type: () => MoleculeSearchInput }) input: MoleculeSearchInput,
    @Args('collectionId', { type: () => ID }) collectionId: UUID,
    @AuthenticatedUserId() userId: UUID
  ): Promise<MoleculeSearchResult[]> {
    return this.moleculeSearchService.searchMolecules_excludeAlreadyAdded(input, collectionId, userId)
  }

}
