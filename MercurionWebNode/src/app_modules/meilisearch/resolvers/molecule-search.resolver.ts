import { Resolver, Query, Args } from '@nestjs/graphql';
import { MoleculeSearchService } from '../services/molecule-search.service';
import { MoleculeSearchResult } from '../Models/DTO/molecule-search-result.cls';
import { MoleculeSearchInput } from '../Models/DTO/molecule-search-input.cls';
import { Public } from 'src/metadata/metadata';



@Resolver(() => MoleculeSearchResult)
export class MoleculeSearchResolver {
  constructor(private readonly moleculeSearchService: MoleculeSearchService) {}

  @Public()
  @Query(() => [MoleculeSearchResult])
  async moleculeSearch(
    @Args('input') input: MoleculeSearchInput,
  ): Promise<MoleculeSearchResult[]> {
    return this.moleculeSearchService.searchMolecules(input);
  }
}
