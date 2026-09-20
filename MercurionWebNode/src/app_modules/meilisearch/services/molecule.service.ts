import { Inject, Injectable } from "@nestjs/common";
import { MoleculeDetail } from "../models/dto/molecule-detail.gql.dtos";
import { MeiliSearch } from "meilisearch";
import { MoleculeSearchResult } from "../models/dto/molecule-search-result.cls";
import { MoleculeDetailModel } from "src/app_modules/chembl/models/dto/molecule-detail-model.interface";
import { LoggerPort } from 'src/logging/logger.port';
import { LoggerContext } from "src/logging/logger.port";
import { errorMessage } from 'src/utils/errors/error-message'

type Maybe<T> = T | null | undefined;
type MoleculeDetailWithMolregno = MoleculeDetailModel & {
    molregno?: number | string;
};

@Injectable()
export class MoleculeService {

    private readonly logger: LoggerContext

    constructor(
        @Inject("MEILISEARCH_CLIENT")
        private readonly meiliClient: MeiliSearch,
        meiliLogger: LoggerPort
    ) {
        this.logger = meiliLogger.forContext(MoleculeService.name)
    }

    // ============= PUBLIC =============

    async existsMoleculeByMolregno(molregno: number): Promise<boolean> {
        const index = this.meiliClient.index('molecule_previews_chembl_36')
        try {
            await index.getDocument(String(molregno))
            return true
        } catch (e) {
            if (e instanceof Error && 'cause' in e && e.cause === 'document_not_found') {
                return false
            }
            this.logger.warn(`MoleculeService > existsMoleculeByMolregno: Error => ${errorMessage(e)}`)
            throw e
        }
    }

    async getDetailByMolregno(molregno: string): Promise<MoleculeDetail | null> {
        const raw = await this.fetchFromChembl(molregno);
        // mapping + fallback name + synonyms normalizzati
        return raw ? this.mapMeiliToDTO(raw, molregno) : null
    }

    async getDetailsByMolregnos(molregnos: string[]): Promise<MoleculeDetail[]> {
        const detailsByMolregno = await this.getDetailsByMolregnosByKey(molregnos)

        return molregnos
            .map((molregno) => detailsByMolregno.get(String(molregno)))
            .filter((detail): detail is MoleculeDetail => Boolean(detail))
    }

    async getDetailsByMolregnosByKey(
        molregnos: string[],
    ): Promise<ReadonlyMap<string, MoleculeDetail>> {
        if (!molregnos.length) {
            return new Map()
        }

        const index = this.meiliClient.index<MoleculeDetailModel>(
            "molecule_details_chembl_36"
        );

        // costruisci il filtro IN (numeri non quotati, stringhe quotate+escapate)
        const filterValues = molregnos
            .map((v) => this.quoteForMeiliFilter(v))
            .join(", ");
        const filter = `molregno IN [${filterValues}]`;

        const res = await index.search<MoleculeDetailModel>("", {
            filter,
            limit: Math.max(molregnos.length, 20),
        });

        const hits = res.hits ?? [];

        // indicizza per molregno (fallback su id/cmbId se necessario)
        const keyOf = (d: MoleculeDetailModel) =>
            String((d as MoleculeDetailWithMolregno).molregno ?? d.id ?? d.cmbId);

        return new Map(
            hits.map((doc) => {
                const molregno = keyOf(doc)
                return [
                    molregno,
                    this.mapMeiliToDTO(doc, molregno),
                ] as const
            })
        )
    }

    async getPreviewsByMolregnos(
        molregnos: string[]
    ): Promise<MoleculeSearchResult[]> {
        const index = this.meiliClient.index("molecule_previews_chembl_36");
        const results: MoleculeSearchResult[] = [];

        for (const molregno of molregnos) {
            try {

                const raw = (await index.getDocument(
                    Number(molregno)
                )) as unknown as MoleculeSearchResult | null;

                if (!raw) {
                    continue
                }

                // normalizza synonyms
                const normalizedSynonyms = this.normalizeSynonyms(
                    raw.synonyms as Maybe<string | string[]>
                );
                const known = raw.preferredName != null || raw.preferredNameIt != null
                const preferredName =
                    raw?.preferredName && String(raw.preferredName).trim().length > 0
                        ? String(raw.preferredName).trim()
                        : `Lead ${molregno}`;
                const preferredNameIt =
                    raw?.preferredNameIt && String(raw.preferredNameIt).trim().length > 0
                        ? String(raw.preferredNameIt).trim()
                        : `Lead ${molregno}`;

                results.push({
                    ...raw,
                    known,
                    preferredName,
                    preferredNameIt,
                    synonyms: normalizedSynonyms,
                });
            } catch {
                // se non trovato o errore, si ignora
            }
        }

        return results;
    }

    // ============= PRIVATE =============

    private async fetchFromChembl(
        molregno: string
    ): Promise<MoleculeDetailModel | null> {
        const index = this.meiliClient.index<MoleculeDetailModel>(
            "molecule_details_chembl_36"
        );

        // numerico → non quotato; altrimenti quotato con escape
        const filter = `molregno = ${this.quoteForMeiliFilter(molregno)}`;

        const res = await index.search<MoleculeDetailModel>("", {
            filter,
            limit: 1,
        });

        return res.hits.length ? res.hits[0] : null
    }

    private mapMeiliToDTO(
        doc: MoleculeDetailModel,
        fallbackMolregno?: string
    ): MoleculeDetail {
        const synonyms = this.normalizeSynonyms(doc.synonyms);

        const preferredName =
            doc.preferredName && String(doc.preferredName).trim().length > 0
                ? String(doc.preferredName).trim()
                : `Lead ${fallbackMolregno ??
                (doc as MoleculeDetailWithMolregno).molregno ??
                doc.id ??
                doc.cmbId ??
                "?"
                }`;

        const preferredNameIt =
            doc.preferredNameIt && String(doc.preferredNameIt).trim().length > 0
                ? String(doc.preferredNameIt).trim()
                : `Lead ${fallbackMolregno ??
                (doc as MoleculeDetailWithMolregno).molregno ??
                doc.id ??
                doc.cmbId ??
                "?"
                }`;

        return {
            id: doc.id,
            cmbId: doc.cmbId,
            preferredName,
            preferredNameIt,
            canonicalSmiles: doc.canonicalSmiles,
            properties: {
                mwFreebase: doc.properties.mwFreebase,
                alogp: doc.properties.alogp,
                hba: doc.properties.hba,
                hbd: doc.properties.hbd,
                psa: doc.properties.psa,
                rtb: doc.properties.rtb,
            },
            maxPhase: doc.maxPhase,
            moleculeType: doc.moleculeType,
            administrationRoutes: {
                oral: !!doc.administrationRoutes.oral,
                parenteral: !!doc.administrationRoutes.parenteral,
                topical: !!doc.administrationRoutes.topical,
            },
            naturalProduct: !!doc.naturalProduct,
            prodrug: !!doc.prodrug,
            blackBoxWarning: !!doc.blackBoxWarning,
            synonyms,
        };
    }

    private normalizeSynonyms(
        raw: Maybe<string | string[]>
    ): string[] {
        if (Array.isArray(raw)) {
            return raw.map((s) => String(s).trim()).filter(Boolean);
        }
        if (typeof raw === "string") {
            return raw
                .split(";")
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
        }
        return [];
    }

    private quoteForMeiliFilter(value: string): string {
        // se tutto numerico → non quotato
        if (/^\d+$/.test(value)) return value;
        // altrimenti quotato con escape di eventuali doppi apici
        return `"${value.replace(/"/g, '\\"')}"`;
    }
}
