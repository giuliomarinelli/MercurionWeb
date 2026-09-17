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
import { UnitOfWork, transactionRepository } from '../../../persistence/transaction-context';
import { toSynthStepPatch } from '../models/dto/synth-patches';

@Injectable()
export class SyntheticStepService {

    private readonly REQUIRED_FIELDS = ['id', 'order', 'userId']

    constructor(
        @InjectRepository(SynthStep)
        private readonly stepRepo: Repository<SynthStep>,
        @InjectRepository(Synthesis)
        private readonly synthesisRepo: Repository<Synthesis>,
        private readonly unitOfWork: UnitOfWork
    ) { }

    async create(userId: UUID, input: SynthStepInput): Promise<SynthStep> {
        try {
            return await this.unitOfWork.run(async context => {
                const stepRepo = transactionRepository(context, SynthStep)
                const synthesisRepo = transactionRepository(context, Synthesis)
                const synthesis = await synthesisRepo.findOne({
                    where: { id: input.synthId, userId }
                })
                if (!synthesis) {
                    throw applicationError(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED)
                }
                const patch = toSynthStepPatch(input)
                const step = stepRepo.create({
                    userId,
                    synth: synthesis,
                    synthId: synthesis.id,
                    order: patch.order,
                    description: patch.description,
                    reactionType: patch.reactionType
                })
                return stepRepo.save(step)
            })
        } catch (error) {
            return throwSynthPersistenceError(error)
        }
    }

    async update(
        userId: UUID,
        id: UUID,
        input: Pick<SynthStepInput, 'order' | 'description' | 'reactionType'>,
        fieldsMap: GraphQLFieldsMap
    ): Promise<SynthStep | null> {
        try {
            return await this.unitOfWork.run(async context => {
                const repo = transactionRepository(context, SynthStep)
                const existing = await repo.findOne({ where: { id, userId } })
                if (!existing) {
                    throw applicationError(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED)
                }
                const result = await repo.update({ id, userId }, toSynthStepPatch(input))
                if ((result.affected ?? 0) === 0) {
                    throw applicationError(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED)
                }
                return this.findOneByIdWithRepository(repo, userId, id, fieldsMap)
            })
        } catch (error) {
            return throwSynthPersistenceError(error)
        }
    }

    async delete(userId: UUID, id: UUID): Promise<SynthCommandResult> {
        try {
            return await this.unitOfWork.run(async context => {
                const repo = transactionRepository(context, SynthStep)
                const existing = await repo.findOne({ where: { id, userId } })
                if (!existing) {
                    throw applicationError(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED)
                }
                const result = await repo.delete({ id, userId })
                if ((result.affected ?? 0) === 0) {
                    throw applicationError(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED)
                }
                return { success: true, outcome: SynthCommandOutcome.Deleted }
            })
        } catch (error) {
            return throwSynthPersistenceError(error)
        }
    }

    async findOneById(userId: UUID, id: UUID, fieldsMap: GraphQLFieldsMap): Promise<SynthStep | null> {
        return this.findOneByIdWithRepository(this.stepRepo, userId, id, fieldsMap)
    }

    private async findOneByIdWithRepository(
        repo: Repository<SynthStep>,
        userId: UUID,
        id: UUID,
        fieldsMap: GraphQLFieldsMap
    ): Promise<SynthStep | null> {
        const scalarFields = GraphQLUtils.getScalarFields(fieldsMap)
        const columns = GraphQLUtils.ensureRequiredFields(scalarFields, this.REQUIRED_FIELDS)
        let qb = repo.createQueryBuilder('step')
            .select(columns.map(col => `step.${col}`))
            .where('step.id = :id', { id })
            .andWhere('step.user_id = :userId', { userId })
        qb = SynthSelectionPlanner.applyForStep(qb, repo.metadata, fieldsMap)
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
