import { ChEMBLMoleculeItemService } from './../../molecule-collection/services/chembl-molecule-item.service';
import { Injectable, Inject } from '@nestjs/common';
import { MeiliSearch } from 'meilisearch'; // o dove hai il client
import { MoleculeSearchInput } from '../Models/DTO/molecule-search-input.cls';
import { SearchParams } from '../Models/interfaces/search-params.interface';
import { MoleculeSearchResult } from '../Models/DTO/molecule-search-result.cls';
import { UUID } from 'crypto';
import { toInt } from 'src/utils/to-int.helper';


@Injectable()
export class MoleculeSearchService {

    constructor(
        @Inject('MEILISEARCH_CLIENT')
        private readonly meiliClient: MeiliSearch,
        private readonly chemblItemService: ChEMBLMoleculeItemService
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
            hit.known = true
            return hit
        }) as MoleculeSearchResult[]

    }

    async searchMolecules_excludeAlreadyAdded(input: MoleculeSearchInput, collectionId: UUID, userId: UUID): Promise<MoleculeSearchResult[]> {
        
        if (!input.query) return []

        const results = await this.searchMolecules(input)

        const excludedMolregnosRaw = await this.chemblItemService.getChemblMolregnosByCollectionId(userId, collectionId)

        const excludedMolregnos = new Set(
            excludedMolregnosRaw
                .map((n) => toInt(n))
                .filter((n) => Number.isFinite(n))
        )

        return results.filter((res) => !excludedMolregnos.has(res.id))
    }


}
