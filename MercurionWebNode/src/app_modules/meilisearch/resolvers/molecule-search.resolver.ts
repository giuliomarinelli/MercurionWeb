import { Resolver, Query, Args, ID } from '@nestjs/graphql';
import { MoleculeSearchService } from '../services/molecule-search.service';
import { MoleculeSearchResult } from '../Models/DTO/molecule-search-result.cls';
import { MoleculeSearchInput } from '../Models/DTO/molecule-search-input.cls';
import { AuthenticatedUserId, Public } from 'src/metadata/metadata';
import { UUID } from 'crypto';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';



@Resolver(() => MoleculeSearchResult)
export class MoleculeSearchResolver {

  constructor(private readonly moleculeSearchService: MoleculeSearchService) { }

  private ensureUuid(value: string, field: string): void {
    GeneralUtils.ensureValidUUIDv7(value, `GraphQLInvalid::Invalid ${field}`)
  }

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
    this.ensureUuid(collectionId, 'collectionId')
    return this.moleculeSearchService.searchMolecules_excludeAlreadyAdded(input, collectionId, userId)
  }

}
