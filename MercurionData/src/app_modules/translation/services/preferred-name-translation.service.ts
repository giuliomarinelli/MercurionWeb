import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { MoleculeNameI18n } from '../Models/entities/molecule-name-i18n.entity';


type TranslationRunResult = {
    model: string;
    totalToTranslate: number;
    translated: number;
    batchSize: number;
};

@Injectable()
export class PreferredNameTranslationService {
    private readonly logger = new Logger(PreferredNameTranslationService.name);

    constructor(
        @InjectRepository(MoleculeNameI18n, 'MercurionConn')
        private readonly nameRepo: Repository<MoleculeNameI18n>,
    ) { }

    async translateAllMissing(
        model = 'gpt-4.1-mini',
        batchSize = 50,
    ): Promise<TranslationRunResult> {
        this.logger.log(`🔵 Start translation run — model=${model}, batchSize=${batchSize}`);

        // Quante righe senza traduzione?
        const totalToTranslate = await this.nameRepo.count({
            where: { preferredIt: IsNull(), preferredEn: Not(IsNull()) },
        });

        this.logger.log(`🔵 Rows with preferred_it IS NULL: ${totalToTranslate}`);

        if (totalToTranslate === 0) {
            return { model, totalToTranslate: 0, translated: 0, batchSize };
        }

        let translated = 0;

        while (true) {
            // 1) Prendi un batch di nomi ancora senza traduzione
            const batch = await this.nameRepo.find({
                where: { preferredIt: IsNull(), preferredEn: Not(IsNull()) },
                take: batchSize,
            });

            if (batch.length === 0) break;

            const names = batch.map(r => r.preferredEn.trim()).filter(Boolean);
            const mols = batch.map(r => r.molregno);

            // 2) Chiama OpenAI per tradurre EN -> IT
            const mapEnToIt = await this.translateBatchWithOpenAi(model, names);

            // 3) Aggiorna in bulk (molregno, preferred_it)
            await this.bulkUpdatePreferredIt(mols, names, mapEnToIt);

            translated += batch.length;
            this.logger.log(`📦 Translated batch — cumulative=${translated}/${totalToTranslate}`);
        }

        this.logger.log(`✅ Translation run completed — translated=${translated}`);

        return { model, totalToTranslate, translated, batchSize };
    }

    /**
     * Chiama l'API OpenAI una sola volta per un batch di nomi.
     * Ritorna una Map EN -> IT.
     */
    private async translateBatchWithOpenAi(
        model: string,
        names: string[],
    ): Promise<Map<string, string>> {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY non impostata nelle env.');
        }

        const systemPrompt = `
Sei un traduttore farmaceutico EN→IT.
Riceverai un array JSON di nomi di molecole/farmaci (INN, denominazioni chimiche, talvolta marchi).
Restituisci SOLO un JSON della forma:
{
  "translations": [
    { "en": "...", "it": "..." },
    ...
  ]
}

Regole:
- Se esiste una forma italiana consolidata (es: "venlafaxine" -> "venlafaxina"), usala.
- Se il nome non ha traduzione italiana o è un codice/sigla (es: "NSC-12345"), lascia invariato.
- Mantieni maiuscole/minuscole rilevanti.
- Non aggiungere commenti, testo extra o spiegazioni: solo JSON valido.
- Nella versione in italiano mantieni lo stesso casing del nome originale in inglese. ad esempio: VENLAFAXINE -> VENLAFAXINA. n-BUTANE -> n-BUTANO
`.trim();

        const userPayload = { names };

        const body = {
            model,
            input: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: JSON.stringify(userPayload) },
            ],
            text: {
                format: { type: 'json_object' },
            }
        };

        const resp = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!resp.ok) {
            const txt = await resp.text();
            this.logger.error(`❌ OpenAI HTTP error: ${resp.status} — ${txt}`);
            throw new Error(`OpenAI API error: ${resp.status}`);
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const data: any = await resp.json();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const rawText: string =
            data?.output?.[0]?.content?.[0]?.text ??
            data?.output_text ??
            data?.choices?.[0]?.message?.content ??
            '';

        let parsed: any;
        try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            parsed = JSON.parse(rawText);
        } catch (e) {
            this.logger.error(`❌ JSON parse error from OpenAI: ${String(e)} — raw=${rawText.slice(0, 200)}`);
            throw e;
        }

        const map = new Map<string, string>();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const arr: any[] = parsed?.translations ?? [];

        for (const item of arr) {
            const en = String(item.en ?? '').trim();
            const it = String(item.it ?? '').trim();
            if (!en) continue;
            map.set(en, it || en); // fallback: se per qualche motivo it vuoto, usa en
        }

        return map;
    }

    /**
     * Aggiorna preferred_it in bulk via UPDATE ... FROM (VALUES ...).
     */
    private async bulkUpdatePreferredIt(
        molregnos: number[],
        namesEn: string[],
        enToIt: Map<string, string>,
    ): Promise<void> {
        if (molregnos.length !== namesEn.length) {
            throw new Error('Dimensione molregnos != namesEn');
        }

        const rows: Array<{ molregno: number; preferred_it: string | null }> = [];

        for (let i = 0; i < molregnos.length; i++) {
            const molregno = molregnos[i];
            const en = namesEn[i];
            const it = enToIt.get(en) ?? en;
            rows.push({ molregno, preferred_it: it });
        }

        const valuesSql = rows
            .map((_, idx) => `($${idx * 2 + 1}::int, $${idx * 2 + 2}::text)`)
            .join(',');

        const params: (number | string | null)[] = [];
        for (const r of rows) {
            params.push(r.molregno, r.preferred_it);
        }

        const sql = `
      UPDATE public.molecule_name_i18n AS tgt
      SET preferred_it = v.preferred_it,
          updated_at   = NOW()
      FROM (
        VALUES ${valuesSql}
      ) AS v(molregno, preferred_it)
      WHERE tgt.molregno = v.molregno
        AND (tgt.preferred_it IS DISTINCT FROM v.preferred_it)
    `;

        await this.nameRepo.query(sql, params);
    }
}
