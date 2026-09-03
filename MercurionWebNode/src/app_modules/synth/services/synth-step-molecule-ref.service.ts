import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UUID } from "crypto";
import { SynthStepMoleculeRef } from "../Models/entities/synth-step-molecule-ref.entity";
import { SynthStepMoleculeRefInput } from "../Models/DTO/synth-step-molecule-ref.input";
import { MoleculeCollectionItemEntity } from "../../molecule-collection/Models/entities/molecule-collection-item.entity";
import { SynthStep } from "../Models/entities/synth-step.entity";

import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'

@Injectable()
export class SynthStepMoleculeRefService {

    constructor(
        @InjectRepository(SynthStepMoleculeRef)
        private readonly refRepo: Repository<SynthStepMoleculeRef>,
        @InjectRepository(SynthStep)
        private readonly stepRepo: Repository<SynthStep>,
        @InjectRepository(MoleculeCollectionItemEntity)
        private readonly moleculeRepo: Repository<MoleculeCollectionItemEntity>
    ) { }

    async create(userId: UUID, input: SynthStepMoleculeRefInput): Promise<SynthStepMoleculeRef> {
        // 1. Verifica che lo step sia dell'utente
        const step = await this.stepRepo.findOne({ where: { id: input.stepId, userId } })
        if (!step) throw applicationError(ApplicationErrorCode.SYNTHETIC_STEP_MOLECULE_ACCESS_DENIED)

        // 2. Verifica che la molecola sia dell'utente
        const molecule = await this.moleculeRepo.findOne({ where: { id: input.moleculeId, userId } })
        if (!molecule) throw applicationError(ApplicationErrorCode.SYNTHETIC_STEP_MOLECULE_ACCESS_DENIED)

        // 3. Crea il ref in sicurezza
        const ref = this.refRepo.create({
            step,
            molecule,
            role: input.role
        })
        return this.refRepo.save(ref)
    }

    async findByStep(stepId: UUID, userId: UUID): Promise<SynthStepMoleculeRef[]> {
        return this.refRepo.find({
            where: { step: { id: stepId, userId }, molecule: { userId } },
            relations: ["step", "molecule"]
        })
    }

    async update(id: UUID, userId: UUID, input: SynthStepMoleculeRefInput): Promise<SynthStepMoleculeRef | null> {
        // 1. Recupera il ref e verifica ownership tramite step
        const ref = await this.refRepo.findOne({ where: { id }, relations: ['step'] });
        if (!ref || ref.step.userId !== userId) throw applicationError(ApplicationErrorCode.SYNTHETIC_STEP_MOLECULE_ACCESS_DENIED)

        // 2. verifica anche che la nuova molecola sia dell’utente
        if (input.moleculeId) {
            const molecule = await this.moleculeRepo.findOne({ where: { id: input.moleculeId, userId } })
            if (!molecule) throw applicationError(ApplicationErrorCode.SYNTHETIC_STEP_MOLECULE_ACCESS_DENIED)
        }

        // 3. Update
        await this.refRepo.update({ id }, { ...input })
        return this.refRepo.findOne({ where: { id }, relations: ["step", "molecule"] })
    }

    async delete(id: UUID, userId: UUID): Promise<boolean> {
        const ref = await this.refRepo.findOne({ where: { id }, relations: ['step'] })
        if (!ref || ref.step.userId !== userId) throw applicationError(ApplicationErrorCode.SYNTHETIC_STEP_MOLECULE_ACCESS_DENIED)
        await this.refRepo.delete({ id })
        return true
    }
}
