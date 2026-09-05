import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UUID } from "crypto";
import { GraphQLFieldsMap, TypeOrmUtils } from "src/utils/type-orm-utils/type-orm-utils";
import { GraphQLUtils } from "src/utils/graphql-utils/graphql-utils";
import { SynthStep } from "../Models/entities/synth-step.entity";
import { SynthStepInput } from "../Models/DTO/synth-step.input";
import { Synthesis } from "../Models/entities/synthesis.entity";
import { ApplicationErrorCode, applicationError } from "src/exception-handling/application-error";

@Injectable()
export class SyntheticStepService {

    private readonly REQUIRED_FIELDS = ['id', 'order', 'userId']

    constructor(
        @InjectRepository(SynthStep)
        private readonly stepRepo: Repository<SynthStep>,
        @InjectRepository(Synthesis)
        private readonly synthesisRepo: Repository<Synthesis>
    ) { }

    async create(userId: UUID, input: SynthStepInput): Promise<SynthStep> {
        const synthesis = await this.synthesisRepo.findOne({
            where: { id: input.synthId, userId }
        })
        if (!synthesis) {
            throw applicationError(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED)
        }
        const step = this.stepRepo.create({
            userId,
            synth: synthesis,
            synthId: synthesis.id,
            order: input.order,
            description: input.description ?? null,
            reactionType: input.reactionType ?? null
        })
        return this.stepRepo.save(step)
    }

    async update(userId: UUID, id: UUID, input: Partial<SynthStepInput>, fieldsMap: GraphQLFieldsMap): Promise<SynthStep | null> {
        const patch: Pick<SynthStep, 'order' | 'description' | 'reactionType'> = {
            order: input.order as number,
            description: input.description ?? null,
            reactionType: input.reactionType ?? null
        }
        await this.stepRepo.update({ id, userId }, patch)
        return this.findOneById(userId, id, fieldsMap)
    }

    async delete(userId: UUID, id: UUID): Promise<boolean> {
        try {
            await this.stepRepo.delete({ id, userId })
            return true
        } catch {
            return false
        }
    }

    async findOneById(userId: UUID, id: UUID, fieldsMap: GraphQLFieldsMap): Promise<SynthStep | null> {
        const scalarFields = GraphQLUtils.getScalarFields(fieldsMap)
        const columns = GraphQLUtils.ensureRequiredFields(scalarFields, this.REQUIRED_FIELDS)
        let qb = this.stepRepo.createQueryBuilder('step')
            .select(columns.map(col => `step.${col}`))
            .where('step.id = :id', { id })
            .andWhere('step.user_id = :userId', { userId })
        qb = TypeOrmUtils.addJoins(qb, 'step', fieldsMap)
        return qb.getOne()
    }


    async findByRoute(userId: UUID, routeId: UUID, fieldsMap: GraphQLFieldsMap): Promise<SynthStep[]> {
        const scalarFields = GraphQLUtils.getScalarFields(fieldsMap)
        const columns = GraphQLUtils.ensureRequiredFields(scalarFields, this.REQUIRED_FIELDS)
        let qb = this.stepRepo.createQueryBuilder('step')
            .select(columns.map(col => `step.${col}`))
            .where('step.synth_id = :routeId', { routeId })
            .andWhere('step.user_id = :userId', { userId })
            .orderBy('step.order', 'ASC')
        qb = TypeOrmUtils.addJoins(qb, 'step', fieldsMap)
        return qb.getMany()
    }


}
