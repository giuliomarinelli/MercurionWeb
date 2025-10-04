import { Inject, Injectable } from "@nestjs/common"
import { MoleculeDetail } from "../Models/DTO/molecule-detail.gql.dtos"
import { MoleculeDetailModel } from "src/app_modules/chembl/Models/DTO/molecule-detail-model.interface"
import { MeiliSearch } from "meilisearch"
import { RpcException } from "@nestjs/microservices"
import { MoleculeSearchResult } from "../Models/DTO/molecule-search-result.cls"

@Injectable()
export class MoleculeService {

    constructor(
        @Inject('MEILISEARCH_CLIENT')
        private readonly meiliClient: MeiliSearch
    ) { }

    async getDetailByMolregno(molregno: string): Promise<MoleculeDetail> {

        const raw = await this.fetchFromChembl(molregno)

        return {
            id: raw.id,
            cmbId: raw.cmbId,
            preferredName: raw.preferredName,
            canonicalSmiles: raw.canonicalSmiles,
            properties: {
                mwFreebase: raw.properties.mwFreebase,
                alogp: raw.properties.alogp,
                hba: raw.properties.hba,
                hbd: raw.properties.hbd,
                psa: raw.properties.psa,
                rtb: raw.properties.rtb
            },
            maxPhase: raw.maxPhase,
            moleculeType: raw.moleculeType,
            administrationRoutes: {
                oral: !!raw.administrationRoutes.oral,
                parenteral: !!raw.administrationRoutes.parenteral,
                topical: !!raw.administrationRoutes.topical
            },
            naturalProduct: !!raw.naturalProduct,
            prodrug: !!raw.prodrug,
            blackBoxWarning: !!raw.blackBoxWarning,
            synonyms: raw.synonyms ?? []
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private async fetchFromChembl(molregno: string) {
        const index = this.meiliClient.index('molecule_details_chembl_36')

        const result = await index.getDocument(molregno).catch(() => {
            throw new RpcException(`MoleculeDetailNotFound::Molecule with molregno = ${molregno} not found`)
        })

        return this.mapMeiliToDTO(result as MoleculeDetailModel)
    }

    private mapMeiliToDTO(doc: MoleculeDetailModel): MoleculeDetail {
        return {
            id: doc.id,
            cmbId: doc.cmbId,
            preferredName: doc.preferredName,
            canonicalSmiles: doc.canonicalSmiles,
            properties: {
                mwFreebase: doc.properties.mwFreebase,
                alogp: doc.properties.alogp,
                hba: doc.properties.hba,
                hbd: doc.properties.hbd,
                psa: doc.properties.psa,
                rtb: doc.properties.rtb
            },
            maxPhase: doc.maxPhase,
            moleculeType: doc.moleculeType,
            administrationRoutes: {
                oral: !!doc.administrationRoutes.oral,
                parenteral: !!doc.administrationRoutes.parenteral,
                topical: !!doc.administrationRoutes.topical
            },
            naturalProduct: !!doc.naturalProduct,
            prodrug: !!doc.prodrug,
            blackBoxWarning: !!doc.blackBoxWarning,
            synonyms: doc.synonyms
        }
    }

    async getDetailsByMolregnos(molregnos: string[]): Promise<MoleculeDetail[]> {
        const index = this.meiliClient.index('molecule_details_chembl_36')
        const results = await Promise.all(
            molregnos.map(molregno =>
                index.getDocument(molregno)
                    .then(doc => this.mapMeiliToDTO(doc as MoleculeDetailModel))
                    .catch(() => null)
            )
        );
        return results.filter(x => !!x)
    }

    async getPreviewsByMolregnos(molregnos: string[]): Promise<MoleculeSearchResult[]> {
        const index = this.meiliClient.index('molecule_previews_chembl_36')
        const results: MoleculeSearchResult[] = []
        for (const molregno of molregnos) {
            let result: MoleculeSearchResult | null = null
            try {
                result = await index.getDocument(Number(molregno)) as unknown as MoleculeSearchResult
            } catch {
                // pass
            }
            if (result != null) {
                results.push(result)
            }

        }
        return results.filter(x => !!x)
    }


}
