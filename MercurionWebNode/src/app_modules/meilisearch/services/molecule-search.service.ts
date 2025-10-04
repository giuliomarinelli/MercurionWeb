import { Injectable, Inject } from '@nestjs/common';
import { MeiliSearch } from 'meilisearch'; // o dove hai il client
import { MoleculeSearchInput } from '../Models/DTO/molecule-search-input.cls';
import { SearchParams } from '../Models/interfaces/search-params.interface';
import { MoleculeSearchResult } from '../Models/DTO/molecule-search-result.cls';


@Injectable()
export class MoleculeSearchService {

    constructor(
        @Inject('MEILISEARCH_CLIENT')
        private readonly meiliClient: MeiliSearch,
    ) { }


    async searchMolecules(input: MoleculeSearchInput): Promise<MoleculeSearchResult[]> {
        
        const index = this.meiliClient.index('molecule_previews_chembl_36')

        const searchParams: SearchParams = {
            q: input.query || '',
            limit: input.limit || 10,
            filter: [] 
        };

        if (input.maxPhase !== undefined) {
            searchParams.filter.push(`maxPhase = ${input.maxPhase}`)
        }
        if (input.moleculeType) {
            searchParams.filter.push(`moleculeType = "${input.moleculeType}"`)
        }
        if (input.minMw !== undefined) {
            searchParams.filter.push(`mwFreebase >= ${input.minMw}`)
        }
        if (input.maxMw !== undefined) {
            searchParams.filter.push(`mwFreebase <= ${input.maxMw}`)
        }

        const results = await index.search(searchParams.q, {
            limit: searchParams.limit,
            filter: searchParams.filter.length > 0 ? searchParams.filter : undefined,
        });

        return results.hits.filter(hit => hit.preferredName != null).map(hit => {
            hit.synonyms = hit.synonyms?.split(';') as string[]
            hit.synonyms = hit.synonyms?.map((syn: string) => syn.trim()) as string[]
            return hit
        }) as MoleculeSearchResult[]

    }
}
