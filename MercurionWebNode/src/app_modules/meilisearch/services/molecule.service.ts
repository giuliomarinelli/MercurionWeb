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
        const index = this.meiliClient.index('molecule_details_chembl_36');

        // se è numerico niente virgolette, altrimenti escapato
        const safeValue = /^\d+$/.test(molregno)
            ? molregno
            : `"${molregno.replace(/"/g, '\\"')}"`;

        const filter = `molregno = ${safeValue}`;

        const res = await index.search<MoleculeDetailModel>('', {
            filter,
            limit: 1,
        });

        if (!res.hits.length) {
            throw new RpcException(
                `MoleculeDetailNotFound::Molecule with molregno = ${molregno} not found`,
            );
        }

        const result = res.hits[0];
        return this.mapMeiliToDTO(result)
    }
    F

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
        const index = this.meiliClient.index('molecule_details_chembl_36');

        // costruisci il filtro IN (numeri non quotati)
        const filterValues = molregnos
            .map(v => (/^\d+$/.test(v) ? v : `"${v.replace(/"/g, '\\"')}"`))
            .join(', ');
        const filter = `molregno IN [${filterValues}]`;

        const res = await index.search<MoleculeDetail>('', {
            filter,
            limit: Math.max(molregnos.length, 20),
        });

        // 🔧 normalizza le chiavi a stringa su ENTRAMBI i lati
        const map = new Map<string, MoleculeDetail>(
            (res.hits ?? []).map(h => [String((h as any).molregno), h]),
        );

        const ordered = molregnos
            .map(m => map.get(String(m)))
            .filter((x): x is MoleculeDetail => Boolean(x));

        return ordered;
    }



    async getPreviewsByMolregnos(molregnos: string[]): Promise<MoleculeSearchResult[]> {
        const index = this.meiliClient.index('molecule_previews_chembl_36')
        const results: MoleculeSearchResult[] = []
        for (const molregno of molregnos) {
            let result: MoleculeSearchResult | null = null
            try {
                result = await index.getDocument(Number(molregno)) as unknown as MoleculeSearchResult
                if (!result.preferredName) {
                    result.preferredName = 'Lead'
                }
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
