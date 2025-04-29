import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { MeiliSearch, Index, RecordAny } from 'meilisearch';
import { MoleculeDetailDBView } from '../../chembl/Models/entities/molecule-detail-db-view.entity';
import { ActivityViewEntity } from '../../chembl/Models/entities/activity-view.entity';
import { ToxicityViewEntity } from '../../chembl/Models/entities/toxicity-view.entity';
import { MoleculeDetailModel } from 'src/app_modules/chembl/Models/DTO/molecule-detail-model.interface';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { MoleculeDetailSyncCheckpoint } from '../Models/interfaces/molecule-detail-sync-checkpoint.interface';


@Injectable()
export class MoleculeDetailSyncService {

    private readonly logger = new Logger(MoleculeDetailSyncService.name)

    private index: Index<RecordAny>

    constructor(
        @InjectRepository(MoleculeDetailDBView, 'ChemblDB')
        private readonly moleculeRepo: Repository<MoleculeDetailDBView>,

        @InjectRepository(ActivityViewEntity, 'ChemblDB')
        private readonly activityRepo: Repository<ActivityViewEntity>,

        @InjectRepository(ToxicityViewEntity, 'ChemblDB')
        private readonly toxicityRepo: Repository<ToxicityViewEntity>,

        @Inject('MEILISEARCH_CLIENT')
        private readonly meiliClient: MeiliSearch,
    ) {
        this.index = this.meiliClient.index('molecules_detail')
    }

    async syncAllMoleculesWithProgress(
        onProgress: (progress: { synced: number; total: number }) => void,
        batchSize = 500,
    ) {
        const total = await this.moleculeRepo.count()
        this.logger.log(`🔵 Total detailed molecules to sync: ${total}`)

        // 🛠️ Checkpoint management
        const checkpointDir = join(process.cwd(), 'sync_storage', 'checkpoints')
        const checkpointFile = join(checkpointDir, 'molecule_detail_sync_checkpoint.json')

        if (!existsSync(checkpointDir)) {
            mkdirSync(checkpointDir, { recursive: true })
        }

        let lastProcessedId: number = 0
        if (existsSync(checkpointFile)) {
            const checkpointData = JSON.parse(readFileSync(checkpointFile, 'utf-8')) as MoleculeDetailSyncCheckpoint
            lastProcessedId = checkpointData.lastProcessedId || 0
        }

        let synced = 0

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const batch = await this.moleculeRepo.find({
                where: { id: MoreThan(lastProcessedId) },
                order: { id: 'ASC' },
                take: batchSize,
            })

            this.logger.log(`🟢 Loaded detailed batch of size: ${batch.length} (lastProcessedId: ${lastProcessedId})`)

            if (batch.length === 0) {
                this.logger.log('🛑 No more molecules to sync, exiting loop.')
                break
            }

            const batchWithEmbeddedData: MoleculeDetailModel[] = await Promise.all(
                batch.map(async (molecule: MoleculeDetailDBView) => {
                    const activities = await this.activityRepo.find({
                        where: { id: molecule.id },
                    });

                    const toxicityData = await this.toxicityRepo.find({
                        where: { id: molecule.id },
                    });

                    return {
                        id: molecule.id,
                        cmbId: molecule.cmbId,
                        preferredName: molecule.preferredName,
                        canonicalSmiles: molecule.canonicalSmiles,
                        standardInchi: molecule.standardInchi,
                        standardInchiKey: molecule.standardInchiKey,
                        molFormula: molecule.molFormula,
                        properties: {
                            mwFreebase: molecule.mwFreebase,
                            alogp: molecule.alogp,
                            hba: molecule.hba,
                            hbd: molecule.hbd,
                            psa: molecule.psa,
                            rtb: molecule.rtb,
                        },
                        maxPhase: molecule.maxPhase,
                        moleculeType: molecule.moleculeType,
                        administrationRoutes: {
                            oral: molecule.oral,
                            parenteral: molecule.parenteral,
                            topical: molecule.topical,
                        },
                        naturalProduct: molecule.naturalProduct,
                        prodrug: molecule.prodrug,
                        blackBoxWarning: molecule.blackBoxWarning,
                        synonyms: molecule.synonyms ? molecule.synonyms.split(';').map(s => s.trim()) : [],
                        activities: activities.map((activity) => ({
                            actionType: activity.actionType,
                            value: activity.standardValue,
                            unit: activity.standardUnits,
                            assayDescription: activity.assayDescription,
                            targetName: activity.targetName,
                            targetOrganism: activity.targetOrganism,
                        })),
                        toxicityData: toxicityData.map((tox) => ({
                            warningType: tox.warningType,
                            warningDescription: tox.warningDescription,
                        })),
                    }
                })
            )

            await this.index.addDocuments(batchWithEmbeddedData, { primaryKey: 'id' })

            // 🔥 Update checkpoint
            lastProcessedId = batch[batch.length - 1].id
            writeFileSync(checkpointFile, JSON.stringify({ lastProcessedId }), 'utf-8')

            synced += batch.length
            onProgress({ synced, total })
        }

        // ✅ Quando ha finito, resetta il checkpoint
        this.logger.log('✅ Sync completed, resetting checkpoint.')
        writeFileSync(checkpointFile, JSON.stringify({ lastProcessedId: 0 }), 'utf-8')
    }
}
