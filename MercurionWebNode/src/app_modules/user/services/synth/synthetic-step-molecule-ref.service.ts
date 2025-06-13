import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UUID } from "crypto";
import { SyntheticStepMoleculeRef } from "../../Models/entities/synth/synthetic-step-molecule-ref.entity";
import { SyntheticStepMoleculeRefInput } from "../../Models/DTO/synth/synthetic-step-molecule-ref.input";
import { MoleculeCollectionItemEntity } from "../../Models/entities/molecule-collection/molecule-collection-item.entity";
import { SyntheticStepEntity } from "../../Models/entities/synth/synthetic-step.entity";

@Injectable()
export class SyntheticStepMoleculeRefService {

    constructor(
        @InjectRepository(SyntheticStepMoleculeRef)
        private readonly refRepo: Repository<SyntheticStepMoleculeRef>
    ) { }

    async create(input: SyntheticStepMoleculeRefInput): Promise<SyntheticStepMoleculeRef> {
        const ref = this.refRepo.create({
            step: { id: input.stepId } as SyntheticStepEntity,
            molecule: { id: input.moleculeId } as MoleculeCollectionItemEntity,
            role: input.role,
            alias: input.alias ?? null
        });
        return this.refRepo.save(ref);
    }

    async findByStep(stepId: UUID, userId: UUID): Promise<SyntheticStepMoleculeRef[]> {
        return this.refRepo.find({
            where: { step: { id: stepId, userId }, molecule: {userId} },
            relations: ["step", "molecule"]
        })
    }

    async update(id: UUID, input: SyntheticStepMoleculeRefInput): Promise<SyntheticStepMoleculeRef | null> {
        await this.refRepo.update({ id }, { ...input })
        return this.refRepo.findOne({ where: { id }, relations: ["step", "molecule"] })
    }

    async delete(id: UUID): Promise<boolean> {
        await this.refRepo.delete({ id })
        return true
    }
}
