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

    // 1) settaggio una tantum (puoi anche leggere da env)
    async onModuleInit() {
        await this.dataSource.query('SET hnsw.ef_search = 80'); // prova 60–120
    }

    async getSimilarMolregnos(molregno: number, n: number, with_no_name: string): Promise<Neighbor[]> {
        const row = await this.moleculeRepo.findOne({
            where: { molregno },
            select: ['embedding'],
        });
        if (!row?.embedding) {
            throw new NotFoundException(`Embedding non trovato per molregno ${molregno}`);
        }

        // in molti setup TypeORM restituisce già number[]; teniamo anche il fallback stringa
        const embedding: number[] = Array.isArray(row.embedding)
            ? (row.embedding as unknown as number[])
            : String(row.embedding)
                .replace(/^\[|\]$|^{|}$/g, '')
                .split(',')
                .map((x) => Number(x.replace(/^"(.*)"$/, '$1')));

        if (!embedding.length) {
            throw new NotFoundException(`Embedding vuoto per molregno ${molregno}`);
        }

        const EPS = 1e-12;
        const extra = Math.max(10, Math.ceil(n * 0.25)); // margine per scarti/duplicati
        const k = n + extra;
        const where = with_no_name === 'true' ? '' : 'WHERE preferred_name IS NOT NULL'
        const q = `
    SELECT molregno, (embedding <=> $1::float8[]::vector) AS distance, preferred_name
    FROM molecule_embeddings
    ${where}
    ORDER BY embedding <=> $1::float8[]::vector ASC
    LIMIT $2
    `
        const rows: Array<{ molregno: number; distance: number }> =
            await this.moleculeRepo.query(
                q,
                [embedding, k],
            );

        // escludi seed e zeri (entro EPS), poi tronca a n
        return rows
            .filter(r => r.molregno !== molregno && r.distance > EPS)
            .slice(0, n);

    }
}
