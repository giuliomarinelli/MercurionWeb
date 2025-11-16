import { Inject, Injectable } from "@nestjs/common";
import { MoleculeDetail } from "../Models/DTO/molecule-detail.gql.dtos";
import { MeiliSearch } from "meilisearch";
import { RpcException } from "@nestjs/microservices";
import { MoleculeSearchResult } from "../Models/DTO/molecule-search-result.cls";
import { MoleculeDetailModel } from "src/app_modules/chembl/Models/DTO/molecule-detail-model.interface";
import { MeiliLoggerService } from "./meili-logger.service";
import { MeiliContextLogger } from "src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface";

type Maybe<T> = T | null | undefined;

@Injectable()
export class MoleculeService {

    private readonly logger: MeiliContextLogger

    constructor(
        @Inject("MEILISEARCH_CLIENT")
        private readonly meiliClient: MeiliSearch,
        meiliLogger: MeiliLoggerService
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
            if (e.cause.code === 'document_not_found') {
                return false
            }
            this.logger.warn(`MoleculeService > existsMoleculeByMolregno: Error => ${e}`)
            throw e
        }
    }

    async getDetailByMolregno(molregno: string): Promise<MoleculeDetail> {
        const raw = await this.fetchFromChembl(molregno);
        // mapping + fallback name + synonyms normalizzati
        return this.mapMeiliToDTO(raw, molregno);
    }

    async getDetailsByMolregnos(molregnos: string[]): Promise<MoleculeDetail[]> {
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
            String((d as any).molregno ?? d.id ?? d.cmbId);

        const map = new Map<string, MoleculeDetail>(
            hits.map((doc) => [keyOf(doc), this.mapMeiliToDTO(doc)])
        );

        // preserva l'ordine richiesto e applica fallback name sul molregno richiesto
        const ordered = molregnos
            .map((m) => {
                const v = map.get(String(m));
                if (!v) return undefined;
                if (!v.preferredName || !v.preferredName.trim()) {
                    v.preferredName = `Lead ${m}`;
                }
                return v;
            })
            .filter((x): x is MoleculeDetail => Boolean(x));

        return ordered;
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
                )) as unknown as MoleculeSearchResult;

                // normalizza synonyms
                const normalizedSynonyms = this.normalizeSynonyms(
                    (raw as any)?.synonyms as Maybe<string | string[]>
                );
                const known = raw.preferredName != null
                const preferredName =
                    raw?.preferredName && String(raw.preferredName).trim().length > 0
                        ? String(raw.preferredName).trim()
                        : `Lead ${molregno}`;

                results.push({
                    ...raw,
                    known,
                    preferredName,
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
    ): Promise<MoleculeDetailModel> {
        const index = this.meiliClient.index<MoleculeDetailModel>(
            "molecule_details_chembl_36"
        );

        // numerico → non quotato; altrimenti quotato con escape
        const filter = `molregno = ${this.quoteForMeiliFilter(molregno)}`;

        const res = await index.search<MoleculeDetailModel>("", {
            filter,
            limit: 1,
        });

        if (!res.hits.length) {
            throw new RpcException(
                `MoleculeDetailNotFound::Molecule with molregno = ${molregno} not found`
            );
        }

        return res.hits[0];
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
                (doc as any)?.molregno ??
                doc.id ??
                doc.cmbId ??
                "?"
                }`;

        const preferredNameIt =
            doc.preferredNameIt && String(doc.preferredNameIt).trim().length > 0
                ? String(doc.preferredNameIt).trim()
                : `Lead ${fallbackMolregno ??
                (doc as any)?.molregno ??
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
