import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { UUID } from 'crypto';
import { DataSource, In } from 'typeorm';
import { ApplicationErrorCode, applicationError } from '../../../exception-handling/application-error';
import { CustomMoleculeItemEntity } from '../../molecule-collection/Models/entities/custom-molecule-item.entity';
import { MoleculeCollection } from '../../molecule-collection/Models/entities/molecule-collection.entity';
import { SynthesisPoolInput } from '../Models/DTO/synthesis-pool.input';
import { SynthStepItem } from '../Models/entities/synth-step-item.entity';
import { SynthesisPoolCollection } from '../Models/entities/synthesis-pool-collection.entity';
import { SynthesisPoolMolecule } from '../Models/entities/synthesis-pool-molecule.entity';
import { Synthesis } from '../Models/entities/synthesis.entity';

@Injectable()
export class SynthesisPoolService {

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource
    ) { }

    async configure(userId: UUID, input: SynthesisPoolInput): Promise<Synthesis> {
        const collectionIds = Array.from(new Set(input.collectionIds))
        const moleculeIds = Array.from(new Set(input.moleculeIds))

        return this.dataSource.transaction(async manager => {
            const synthesis = await manager.findOne(Synthesis, {
                where: { id: input.synthesisId, userId }
            })
            if (!synthesis) {
                throw applicationError(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED)
            }

            const collections = collectionIds.length > 0
                ? await manager.find(MoleculeCollection, {
                    where: { id: In(collectionIds), userId }
                })
                : []
            if (collections.length !== collectionIds.length) {
                throw applicationError(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED)
            }

            const molecules = moleculeIds.length > 0
                ? await manager.find(CustomMoleculeItemEntity, {
                    where: { id: In(moleculeIds), userId, type: 'custom' }
                })
                : []
            if (molecules.length !== moleculeIds.length) {
                throw applicationError(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED)
            }

            const existingPool = await manager.find(SynthesisPoolMolecule, {
                where: { synthesisId: synthesis.id, userId }
            })
            const existingCollections = await manager.find(SynthesisPoolCollection, {
                where: { synthesisId: synthesis.id, userId }
            })
            const retainedMoleculeIds = new Set(moleculeIds)
            const removedPool = existingPool
                .filter(poolMolecule => !retainedMoleculeIds.has(poolMolecule.moleculeId))
            const removedPoolIds = removedPool.map(poolMolecule => poolMolecule.id)

            if (removedPoolIds.length > 0) {
                const usedPoolMolecule = await manager.exists(SynthStepItem, {
                    where: { poolMoleculeId: In(removedPoolIds), userId }
                })
                if (usedPoolMolecule) {
                    throw applicationError(ApplicationErrorCode.SYNTHESIS_POOL_ITEM_IN_USE)
                }
            }

            const retainedCollectionIds = new Set(collectionIds)
            const removedCollectionLinkIds = existingCollections
                .filter(poolCollection => !retainedCollectionIds.has(poolCollection.collectionId))
                .map(poolCollection => poolCollection.id)

            if (removedCollectionLinkIds.length > 0) {
                await manager.delete(SynthesisPoolCollection, {
                    id: In(removedCollectionLinkIds),
                    userId
                })
            }
            if (removedPoolIds.length > 0) {
                await manager.delete(SynthesisPoolMolecule, {
                    id: In(removedPoolIds),
                    userId
                })
            }

            const existingCollectionIds = new Set(existingCollections.map(link => link.collectionId))
            const addedCollections = collections.filter(collection => !existingCollectionIds.has(collection.id))
            if (addedCollections.length > 0) {
                await manager.save(SynthesisPoolCollection, addedCollections.map(collection =>
                    manager.create(SynthesisPoolCollection, {
                        userId,
                        synthesis,
                        synthesisId: synthesis.id,
                        collection,
                        collectionId: collection.id
                    })
                ))
            }

            const existingMoleculeIds = new Set(existingPool.map(poolMolecule => poolMolecule.moleculeId))
            const addedMolecules = molecules.filter(molecule => !existingMoleculeIds.has(molecule.id))
            if (addedMolecules.length > 0) {
                await manager.save(SynthesisPoolMolecule, addedMolecules.map(molecule =>
                    manager.create(SynthesisPoolMolecule, {
                        userId,
                        synthesis,
                        synthesisId: synthesis.id,
                        molecule,
                        moleculeId: molecule.id
                    })
                ))
            }

            const configured = await manager.findOne(Synthesis, {
                where: { id: synthesis.id, userId },
                relations: {
                    poolCollections: { collection: true },
                    poolMolecules: { molecule: true }
                }
            })
            if (!configured) {
                throw applicationError(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED)
            }
            return configured
        })
    }
}
