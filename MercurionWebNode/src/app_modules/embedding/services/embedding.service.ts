// embedding/embedding.service.ts
import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MoleculeEmbedding } from '../Models/entities/molecule-embedding.entity';

export type Neighbor = { molregno: number; distance: number };

@Injectable()
export class EmbeddingService implements OnModuleInit {
    constructor(
        @InjectRepository(MoleculeEmbedding)
        private readonly moleculeRepo: Repository<MoleculeEmbedding>,
        private readonly dataSource: DataSource,
    ) { }

    // Set globale (puoi spostare su env). Tieni valori ragionevoli per HNSW.
    async onModuleInit() {
        await this.dataSource.query('SET hnsw.ef_search = 80'); // tipico 60–120
    }

    /**
     * Ritorna i n vicini del molregno dato.
     * - Se with_no_name === 'false' ⇒ solo con preferred_name NON NULL (query singola).
     * - Altrimenti ⇒ UNA SOLA ANN query su tutti, poi merge lato app: prima con nome, poi senza.
     *   Se non bastano (raro), fa un unico retry con oversampling maggiore.
     */
    async getSimilarMolregnos(
        molregno: number,
        n: number,
        with_no_name: string,
    ): Promise<Neighbor[]> {
        // 1) prendi l'embedding seed
        const row = await this.moleculeRepo.findOne({
            where: { molregno },
            select: ['embedding'],
        });
        if (!row?.embedding) {
            throw new NotFoundException(`Embedding non trovato per molregno ${molregno}`);
        }

        // 2) normalizza embedding (alcuni driver danno già number[])
        const embedding: number[] = Array.isArray(row.embedding)
            ? (row.embedding)
            : String(row.embedding)
                .replace(/^\[|\]$|^{|}$/g, '')
                .split(',')
                .map((x) => Number(x.replace(/^"(.*)"$/, '$1')))
                .filter((v) => Number.isFinite(v));

        if (!embedding.length) {
            throw new NotFoundException(`Embedding vuoto per molregno ${molregno}`);
        }

        const EPS = 1e-12;

        // 3) strategia veloce
        const allowUnnamed = with_no_name !== 'false';

        // oversampling: più alto se accetti anche i senza nome (per assicurare abbastanza "con nome")
        const baseK = this.oversample(n, allowUnnamed, /*first try*/ true);
        const maxK = 2000; // tetto di sicurezza

        if (!allowUnnamed) {
            // === SOLO CON NOME: una query, filtro su preferred_name IS NOT NULL ===
            const q = `
        SELECT molregno,
               (embedding <=> $1::float8[]::vector) AS distance
        FROM molecule_embeddings
        WHERE molregno <> $2
          AND preferred_name IS NOT NULL
        ORDER BY embedding <=> $1::float8[]::vector
        LIMIT $3
      `;
            const rows: Array<{ molregno: number; distance: number }> =
                await this.moleculeRepo.query(q, [embedding, molregno, baseK]);

            return rows
                .map(r => ({ molregno: Number(r.molregno), distance: Number(r.distance) }))
                .filter(r => r.distance > EPS)
                .slice(0, n);
        }

        // === CON FALLBACK AI SENZA NOME: una sola ANN query su tutti, merge lato app ===
        let k = baseK;
        for (let attempt = 0; attempt < 2; attempt++) {
            const qAll = `
        SELECT molregno,
               (embedding <=> $1::float8[]::vector) AS distance,
               (preferred_name IS NOT NULL) AS has_name
        FROM molecule_embeddings
        WHERE molregno <> $2
        ORDER BY embedding <=> $1::float8[]::vector
        LIMIT $3
      `;
            const rows: Array<{ molregno: number; distance: number; has_name: boolean }> =
                await this.moleculeRepo.query(qAll, [embedding, molregno, k]);

            // normalizza e filtra EPS
            const cleaned = rows
                .map(r => ({
                    molregno: Number(r.molregno),
                    distance: Number(r.distance),
                    has_name: !!(r as any).has_name,
                }))
                .filter(r => r.distance > EPS);

            // split + merge (prima con nome)
            const named = cleaned.filter(r => r.has_name).slice(0, n);
            if (named.length >= n) {
                return named.map(({ molregno, distance }) => ({ molregno, distance }));
            }

            const remaining = n - named.length;
            const unnamed = cleaned.filter(r => !r.has_name).slice(0, remaining);
            const merged = [...named, ...unnamed]
                .map(({ molregno, distance }) => ({ molregno, distance }));

            if (merged.length >= n) {
                return merged.slice(0, n);
            }

            // se ancora non bastano (p.es. dataset scarno o molti a distanza ~0),
            // fai UN solo retry con oversampling più grande.
            const nextK = this.oversample(n, allowUnnamed, /*first try*/ false);
            if (k >= nextK || k >= maxK) {
                return merged; // meglio tornare il massimo disponibile che fare altri round-trip
            }
            k = Math.min(nextK, maxK);
        }

        // fallback (praticamente mai qui)
        return [];
    }

    /**
     * Oversampling euristico:
     * - Primo tentativo:  n + max(10, ceil(n*0.5)) se allowUnnamed, altrimenti n + max(8, ceil(n*0.25))
     * - Secondo tentativo: scala ×2 (cap a 1000).
     */
    private oversample(n: number, allowUnnamed: boolean, firstTry: boolean): number {
        const add = allowUnnamed ? Math.max(10, Math.ceil(n * 0.5)) : Math.max(8, Math.ceil(n * 0.25));
        const k1 = n + add;
        if (firstTry) return Math.min(k1, 600);
        // retry: raddoppia ma con tetto
        return Math.min(Math.max(n + add * 2, k1 * 2), 1000);
    }
}
