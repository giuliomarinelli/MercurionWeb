// embedding/embedding.service.ts
import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MoleculeEmbedding } from '../models/entities/molecule-embedding.entity';
import type { EmbeddingNeighbor } from '@mercurion/rest-contracts'

export type Neighbor = EmbeddingNeighbor

@Injectable()
export class EmbeddingService implements OnModuleInit {
    constructor(
        @InjectRepository(MoleculeEmbedding)
        private readonly moleculeRepo: Repository<MoleculeEmbedding>,
        private readonly dataSource: DataSource,
    ) { }

    async onModuleInit() {
        await this.dataSource.query('SET hnsw.ef_search = 80');
    }

    async getSimilarMolregnos(
        molregno: number,
        n: number,
        with_no_name: string,
    ): Promise<Neighbor[]> {
        const row = await this.moleculeRepo.findOne({
            where: { molregno },
            select: ['molregno', 'embedding'],
        });

        if (!row?.embedding) {
            throw new NotFoundException(`Embedding non trovato per molregno ${molregno}`);
        }

        return this.getSimilarFromSeed(
            this.normalizeEmbedding(row.embedding),
            row.molregno,
            n,
            with_no_name,
        );
    }

    async getSimilarBySmiles(
        smiles: string,
        n: number,
        with_no_name: string,
    ): Promise<Neighbor[]> {
        const row = await this.moleculeRepo.findOne({
            where: { smiles },
            select: ['molregno', 'embedding'],
        });

        // A live editor may contain a perfectly valid but completely novel
        // structure. That is an expected "no seed in corpus" condition, not an
        // application error.
        if (!row?.embedding) {
            return [];
        }

        return this.getSimilarFromSeed(
            this.normalizeEmbedding(row.embedding),
            row.molregno,
            n,
            with_no_name,
        );
    }

    private async getSimilarFromSeed(
        embedding: number[],
        excludedMolregno: number,
        n: number,
        with_no_name: string,
    ): Promise<Neighbor[]> {
        if (!embedding.length) {
            return [];
        }

        const EPS = 1e-12;
        const allowUnnamed = with_no_name !== 'false';
        const baseK = this.oversample(n, allowUnnamed, true);
        const maxK = 2000;

        if (!allowUnnamed) {
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
                await this.moleculeRepo.query(q, [embedding, excludedMolregno, baseK]);

            return rows
                .map(r => ({ molregno: Number(r.molregno), distance: Number(r.distance) }))
                .filter(r => r.distance > EPS)
                .slice(0, n);
        }

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
                await this.moleculeRepo.query(qAll, [embedding, excludedMolregno, k]);

            const cleaned = rows
                .map(r => ({
                    molregno: Number(r.molregno),
                    distance: Number(r.distance),
                    has_name: r.has_name,
                }))
                .filter(r => r.distance > EPS);

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

            const nextK = this.oversample(n, allowUnnamed, false);
            if (k >= nextK || k >= maxK) {
                return merged;
            }
            k = Math.min(nextK, maxK);
        }

        return [];
    }

    private normalizeEmbedding(embedding: number[] | string): number[] {
        if (Array.isArray(embedding)) {
            return embedding
                .map(Number)
                .filter(value => Number.isFinite(value));
        }

        return String(embedding)
            .replace(/^\[|\]$|^{|}$/g, '')
            .split(',')
            .map(value => Number(value.replace(/^"(.*)"$/, '$1')))
            .filter(value => Number.isFinite(value));
    }

    private oversample(n: number, allowUnnamed: boolean, firstTry: boolean): number {
        const add = allowUnnamed
            ? Math.max(10, Math.ceil(n * 0.5))
            : Math.max(8, Math.ceil(n * 0.25));
        const k1 = n + add;
        if (firstTry) return Math.min(k1, 600);
        return Math.min(Math.max(n + add * 2, k1 * 2), 1000);
    }
}
