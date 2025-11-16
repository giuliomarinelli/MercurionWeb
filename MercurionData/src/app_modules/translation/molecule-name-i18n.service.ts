import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MoleculeIndexView } from 'src/app_modules/chembl_36/Models/entities/molecule-index-mv';


type SeedResult = {
  totalSource: number;
  upserted: number;
};

@Injectable()
export class MoleculeNameI18nSeedService {
  private readonly logger = new Logger(MoleculeNameI18nSeedService.name);

  constructor(
    // sorgente: chembl_36 (default connection)
    @InjectRepository(MoleculeIndexView)
    private readonly moleculeRepo: Repository<MoleculeIndexView>,

    // destinazione: MercurionConn (molecule_name_i18n)
    @InjectDataSource('MercurionConn')
    private readonly mercurionDS: DataSource,
  ) {}

  /**
   * Seeda la tabella molecule_name_i18n con (molregno, preferred_en),
   * facendo DISTINCT sui nomi non-null lato DB e upsert in batch.
   *
   * Operazione pensata per essere await-ata in un singolo endpoint HTTP.
   */
  async seedAll(batchSize = 1_000): Promise<SeedResult> {
    this.logger.log('🔵 Avvio seeding molecule_name_i18n...');

    // 1) Estrai DISTINCT molregno + preferred_name dalla MV chembl_36
    this.logger.log('🔵 Carico elenco molregno/preferred_name (distinct, non-null)...');

    const rows = await this.moleculeRepo
      .createQueryBuilder('v')
      .select([
        "(v.doc->>'id')::int AS molregno",
        "v.doc->>'preferredName' AS preferred_en",
      ])
      .where("v.doc->>'preferredName' IS NOT NULL")
      .distinct(true)
      .getRawMany<{ molregno: number; preferred_en: string }>();

    const totalSource = rows.length;
    this.logger.log(`🔵 Trovati ${totalSource} nomi distinti con preferredName non-null.`);

    if (totalSource === 0) {
      return { totalSource: 0, upserted: 0 };
    }

    // 2) Upsert in batch sulla tabella Mercurion molecule_name_i18n
    let upserted = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);

      const valuesSql = batch
        .map((_, idx) => `($${idx * 2 + 1}, $${idx * 2 + 2})`)
        .join(',');

      const params: (number | string)[] = [];
      for (const r of batch) {
        params.push(r.molregno);
        params.push(r.preferred_en);
      }

      const sql = `
        INSERT INTO public.molecule_name_i18n (molregno, preferred_en)
        VALUES ${valuesSql}
        ON CONFLICT (molregno) DO UPDATE
        SET preferred_en = EXCLUDED.preferred_en,
            updated_at   = NOW()
      `;

      const res: any = await this.mercurionDS.query(sql, params);
      // rowCount non è garantito via TypeORM, quindi stimiamo con batch.length
      const batchCount =
        typeof res?.rowCount === 'number' ? res.rowCount : batch.length;

      upserted += batchCount;
      this.logger.log(
        `📦 Batch ${i / batchSize + 1} — righe=${batch.length}, upsert cumulative=${upserted}`,
      );
    }

    this.logger.log(
      `✅ Seeding completato. totalSource=${totalSource}, upserted≈${upserted}`,
    );

    return { totalSource, upserted };
  }
}
