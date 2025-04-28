import { Resolver, Query, Args } from '@nestjs/graphql';
import { MoleculeSearchResult } from '../Models/DTO/molecule-search-result.cls';
import { MoleculeSearchService } from '../services/molecule-search.service';



@Resolver(() => MoleculeSearchResult)
export class MoleculeSearchResolver {

  constructor(private readonly moleculeSearchService: MoleculeSearchService) {}

  @Query(() => [MoleculeSearchResult])
  async moleculeSearch(@Args('query') query: string): Promise<MoleculeSearchResult[]> {
    return this.moleculeSearchService.searchMolecules(query)
  }
}
