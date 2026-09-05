import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UUID } from 'crypto';
import { Repository } from 'typeorm';
import { ApplicationErrorCode, applicationError } from '../../../exception-handling/application-error';
import { SynthStepItemInput } from '../Models/DTO/synth-step-item.input';
import { SynthStepItem } from '../Models/entities/synth-step-item.entity';
import { SynthStep } from '../Models/entities/synth-step.entity';
import { SynthesisPoolMolecule } from '../Models/entities/synthesis-pool-molecule.entity';
import { SynthStepItemKind } from '../Models/enums/synth-step-item-kind.enum';
import { SynthStepItemPosition } from '../Models/enums/synth-step-item-position.enum';

@Injectable()
export class SynthStepItemService {

    constructor(
        @InjectRepository(SynthStepItem)
        private readonly itemRepo: Repository<SynthStepItem>,
        @InjectRepository(SynthStep)
        private readonly stepRepo: Repository<SynthStep>,
        @InjectRepository(SynthesisPoolMolecule)
        private readonly poolRepo: Repository<SynthesisPoolMolecule>
    ) { }

    async create(userId: UUID, input: SynthStepItemInput): Promise<SynthStepItem> {
        const context = await this.resolveContext(userId, input)
        const item = this.itemRepo.create({
            userId,
            step: context.step,
            stepId: context.step.id,
            poolMolecule: context.poolMolecule,
            poolMoleculeId: context.poolMolecule?.id ?? null,
            text: input.text?.trim() || null,
            kind: input.kind,
            position: input.position,
            order: input.order
        })
        return this.itemRepo.save(item)
    }

    async findByStep(stepId: UUID, userId: UUID): Promise<SynthStepItem[]> {
        return this.itemRepo.find({
            where: { stepId, userId },
            relations: ['poolMolecule', 'poolMolecule.molecule'],
            order: { position: 'ASC', order: 'ASC' }
        })
    }

    async update(id: UUID, userId: UUID, input: SynthStepItemInput): Promise<SynthStepItem | null> {
        const existing = await this.itemRepo.findOne({ where: { id, userId } })
        if (!existing) {
            throw applicationError(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED)
        }

        const context = await this.resolveContext(userId, input)
        await this.itemRepo.update({ id, userId }, {
            step: context.step,
            stepId: context.step.id,
            poolMolecule: context.poolMolecule,
            poolMoleculeId: context.poolMolecule?.id ?? null,
            text: input.text?.trim() || null,
            kind: input.kind,
            position: input.position,
            order: input.order
        })
        return this.itemRepo.findOne({
            where: { id, userId },
            relations: ['poolMolecule', 'poolMolecule.molecule']
        })
    }

    async delete(id: UUID, userId: UUID): Promise<boolean> {
        const item = await this.itemRepo.findOne({ where: { id, userId } })
        if (!item) {
            throw applicationError(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED)
        }
        await this.itemRepo.delete({ id, userId })
        return true
    }

    private async resolveContext(userId: UUID, input: SynthStepItemInput): Promise<{
        step: SynthStep,
        poolMolecule: SynthesisPoolMolecule | null
    }> {
        const step = await this.stepRepo.findOne({ where: { id: input.stepId, userId } })
        if (!step) {
            throw applicationError(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED)
        }

        this.validateSemantics(input)

        let poolMolecule: SynthesisPoolMolecule | null = null
        if (input.poolMoleculeId) {
            poolMolecule = await this.poolRepo.findOne({
                where: {
                    id: input.poolMoleculeId,
                    synthesisId: step.synthId,
                    userId
                }
            })
            if (!poolMolecule) {
                throw applicationError(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED)
            }
        }

        return { step, poolMolecule }
    }

    private validateSemantics(input: SynthStepItemInput): void {
        const hasMolecule = Boolean(input.poolMoleculeId)
        const hasText = Boolean(input.text?.trim())
        if (!hasMolecule && !hasText) {
            throw applicationError(ApplicationErrorCode.SYNTH_STEP_ITEM_INVALID)
        }

        if (
            (input.kind === SynthStepItemKind.Reactant || input.kind === SynthStepItemKind.Product) &&
            !hasMolecule
        ) {
            throw applicationError(ApplicationErrorCode.SYNTH_STEP_ITEM_INVALID)
        }

        const validPosition =
            (input.kind === SynthStepItemKind.Reactant &&
                (input.position === SynthStepItemPosition.BeforeArrow || input.position === SynthStepItemPosition.OnArrow)) ||
            (input.kind === SynthStepItemKind.Product && input.position === SynthStepItemPosition.AfterArrow) ||
            (input.kind !== SynthStepItemKind.Reactant &&
                input.kind !== SynthStepItemKind.Product &&
                input.position === SynthStepItemPosition.OnArrow)

        if (!validPosition) {
            throw applicationError(ApplicationErrorCode.SYNTH_STEP_ITEM_INVALID)
        }
    }
}
