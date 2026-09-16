import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UUID } from "crypto";
import { GraphQLFieldsMap } from "src/utils/type-orm-utils/type-orm-utils";
import { GraphQLUtils } from "src/utils/graphql-utils/graphql-utils";
import { SynthStep } from "../models/entities/synth-step.entity";
import { SynthStepInput } from "../models/dto/synth-step.input";
import { Synthesis } from "../models/entities/synthesis.entity";
import { ApplicationErrorCode, applicationError } from "src/exception-handling/application-error";
import { SynthCommandOutcome, SynthCommandResult } from "../models/dto/synth-command-result";
import { SynthSelectionPlanner } from './synth-selection-planner';
import { throwSynthPersistenceError } from './synth-command-errors';

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
        let synthesis: Synthesis | null
        try {
            synthesis = await this.synthesisRepo.findOne({
                where: { id: input.synthId, userId }
            })
        } catch (error) {
            return throwSynthPersistenceError(error)
        }
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
        try {
            return await this.stepRepo.save(step)
        } catch (error) {
            return throwSynthPersistenceError(error)
        }
    }

    async update(userId: UUID, id: UUID, input: Partial<SynthStepInput>, fieldsMap: GraphQLFieldsMap): Promise<SynthStep | null> {
        const patch: Pick<SynthStep, 'order' | 'description' | 'reactionType'> = {
            order: input.order as number,
            description: input.description ?? null,
            reactionType: input.reactionType ?? null
        }
        try {
            const result = await this.stepRepo.update({ id, userId }, patch)
            if ((result.affected ?? 0) === 0) {
                throw applicationError(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED)
            }
            return this.findOneById(userId, id, fieldsMap)
        } catch (error) {
            return throwSynthPersistenceError(error)
        }
    }

    async delete(userId: UUID, id: UUID): Promise<SynthCommandResult> {
        try {
            const result = await this.stepRepo.delete({ id, userId })
            if ((result.affected ?? 0) === 0) {
                throw applicationError(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED)
            }
            return { success: true, outcome: SynthCommandOutcome.Deleted }
        } catch (error) {
            return throwSynthPersistenceError(error)
        }
    }

    async findOneById(userId: UUID, id: UUID, fieldsMap: GraphQLFieldsMap): Promise<SynthStep | null> {
        const scalarFields = GraphQLUtils.getScalarFields(fieldsMap)
        const columns = GraphQLUtils.ensureRequiredFields(scalarFields, this.REQUIRED_FIELDS)
        let qb = this.stepRepo.createQueryBuilder('step')
            .select(columns.map(col => `step.${col}`))
            .where('step.id = :id', { id })
            .andWhere('step.user_id = :userId', { userId })
        qb = SynthSelectionPlanner.applyForStep(qb, this.stepRepo.metadata, fieldsMap)
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
        qb = SynthSelectionPlanner.applyForStep(qb, this.stepRepo.metadata, fieldsMap)
        return qb.getMany()
    }


}
