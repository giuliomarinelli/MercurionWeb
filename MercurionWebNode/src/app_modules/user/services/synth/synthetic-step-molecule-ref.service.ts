import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UUID } from "crypto";
import { SyntheticStepMoleculeRef } from "../../Models/entities/synth/synthetic-step-molecule-ref.entity";
import { SyntheticStepMoleculeRefInput } from "../../Models/DTO/synth/synthetic-step-molecule-ref.input";
import { MoleculeCollectionItemEntity } from "../../Models/entities/molecule-collection/molecule-collection-item.entity";
import { SyntheticStepEntity } from "../../Models/entities/synth/synthetic-step.entity";
import { RpcException } from "@nestjs/microservices";

@Injectable()
export class SyntheticStepMoleculeRefService {

    constructor(
        @InjectRepository(SyntheticStepMoleculeRef)
        private readonly refRepo: Repository<SyntheticStepMoleculeRef>,
        @InjectRepository(SyntheticStepEntity)
        private readonly stepRepo: Repository<SyntheticStepEntity>,
        @InjectRepository(MoleculeCollectionItemEntity)
        private readonly moleculeRepo: Repository<MoleculeCollectionItemEntity>
    ) { }

    async create(userId: UUID, input: SyntheticStepMoleculeRefInput): Promise<SyntheticStepMoleculeRef> {
        // 1. Verifica che lo step sia dell'utente
        const step = await this.stepRepo.findOne({ where: { id: input.stepId as UUID, userId } })
        if (!step) throw new RpcException("SyntheticStepMoleculeRefError::Forbidden")

        // 2. Verifica che la molecola sia dell'utente
        const molecule = await this.moleculeRepo.findOne({ where: { id: input.moleculeId as UUID, userId } })
        if (!molecule) throw new RpcException("SyntheticStepMoleculeRefError::Forbidden")

        // 3. Crea il ref in sicurezza
        const ref = this.refRepo.create({
            step,
            molecule,
            role: input.role,
            alias: input.alias ?? null
        });
        return this.refRepo.save(ref)
    }

    async findByStep(stepId: UUID, userId: UUID): Promise<SyntheticStepMoleculeRef[]> {
        return this.refRepo.find({
            where: { step: { id: stepId, userId }, molecule: { userId } },
            relations: ["step", "molecule"]
        });
    }

    async update(id: UUID, userId: UUID, input: SyntheticStepMoleculeRefInput): Promise<SyntheticStepMoleculeRef | null> {
        // 1. Recupera il ref e verifica ownership tramite step
        const ref = await this.refRepo.findOne({ where: { id }, relations: ['step'] });
        if (!ref || ref.step.userId !== userId) throw new RpcException("SyntheticStepMoleculeRefError::Forbidden")

        // 2. verifica anche che la nuova molecola sia dell’utente
        if (input.moleculeId) {
            const molecule = await this.moleculeRepo.findOne({ where: { id: input.moleculeId as UUID, userId } })
            if (!molecule) throw new RpcException("SyntheticStepMoleculeRefError::Forbidden")
        }

        // 3. Update
        await this.refRepo.update({ id }, { ...input })
        return this.refRepo.findOne({ where: { id }, relations: ["step", "molecule"] })
    }

    async delete(id: UUID, userId: UUID): Promise<boolean> {
        const ref = await this.refRepo.findOne({ where: { id }, relations: ['step'] })
        if (!ref || ref.step.userId !== userId) throw new RpcException("SyntheticStepMoleculeRefError::Forbidden")
        await this.refRepo.delete({ id })
        return true
    }
}
