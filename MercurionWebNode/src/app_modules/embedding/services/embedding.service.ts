// embedding/embedding.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MoleculeEmbedding } from '../Models/entities/molecule-embedding.entity';
import { GetSimilarMolregnosDto } from '../DTO/get-similar-molregnos.dto';



function parsePgArrayString(s: string): number[] {
    // Gestisce formati: {1,2,3} oppure {"1","2",...}
    if (!s) return [];
    const trimmed = s.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const inner = trimmed.slice(1, -1);
        // split che rispetta numeri con virgole? Qui i numeri sono semplici -> split su , va bene
        return inner
            .split(',')
            .map((x) => x.replace(/^"(.*)"$/, '$1')) // leva eventuali doppi apici
            .map((x) => Number(x));
    }
    // Se arriva con formato vettoriale di pgvector: [1,2,3]
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const inner = trimmed.slice(1, -1);
        return inner.split(',').map((x) => Number(x));
    }
    throw new Error('Formato embedding non riconosciuto');
}

@Injectable()
export class EmbeddingService {
    constructor(
        @InjectRepository(MoleculeEmbedding)
        private readonly moleculeRepo: Repository<MoleculeEmbedding>,
    ) { }

    async getSimilarMolregnos({ molregno, n = 10 }: GetSimilarMolregnosDto): Promise<number[]> {
        // 1) prendi embedding target (può arrivare come number[] o come string)
        const row = await this.moleculeRepo.findOne({
            where: { molregno },
            select: ['embedding'],
        });

        if (!row?.embedding) {
            throw new NotFoundException(`Embedding non trovato per molregno ${molregno}`);
        }

        // Normalizza a number[]
        const embedding: number[] = Array.isArray(row.embedding)
            ? (row.embedding as unknown as number[])
            : parsePgArrayString(String(row.embedding));

        if (!embedding.length) {
            throw new NotFoundException(`Embedding vuoto per molregno ${molregno}`);
        }

        // 2) Query con cast esplicito: float8[] -> vector
        //    Così evitiamo il formato testuale del vector.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const rows: Array<{ molregno: number; similarity: number }> = await this.moleculeRepo.query(
            `
  SELECT
    molregno,
    1 - (embedding <=> $1::float8[]::vector) AS similarity
  FROM molecule_embeddings
  WHERE embedding IS NOT NULL
    AND molregno <> $2
  ORDER BY similarity DESC
  LIMIT $3
  `,
            [embedding, molregno, n],
        );

        return rows.map((r) => r.molregno);

    }
}
