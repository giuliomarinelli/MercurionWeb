import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UUID } from "crypto";
import { GraphQLUtils } from "src/utils/graphql-utils/graphql-utils";
import { GraphQLFieldsMap } from "src/utils/type-orm-utils/type-orm-utils";
import { Synthesis } from "../models/entities/synthesis.entity";
import { SynthesisInput } from "../models/dto/synthesis.input";
import { SynthCommandOutcome, SynthCommandResult } from "../models/dto/synth-command-result";
import { ApplicationErrorCode, applicationError } from "src/exception-handling/application-error";
import { SynthSelectionPlanner } from './synth-selection-planner';
import { throwSynthPersistenceError } from './synth-command-errors';
import { UnitOfWork, transactionRepository } from '../../../persistence/transaction-context';
import { toSynthesisPatch } from '../models/dto/synth-patches';

@Injectable()
export class SynthesisService {

    constructor(
        @InjectRepository(Synthesis)
        private readonly routeRepo: Repository<Synthesis>,
        private readonly unitOfWork: UnitOfWork,
    ) { }

    async create(userId: UUID, input: SynthesisInput): Promise<Synthesis> {
        try {
            return await this.unitOfWork.run(async context => {
                const repo = transactionRepository(context, Synthesis)
                const patch = toSynthesisPatch(input)
                const route = repo.create({
                    userId,
                    title: patch.title,
                    notes: patch.notes
                })
                return repo.save(route)
            })
        } catch (error) {
            return throwSynthPersistenceError(error)
        }
    }

    async update(id: UUID, userId: UUID, input: SynthesisInput, fieldsMap: GraphQLFieldsMap): Promise<Synthesis | null> {
        try {
            return await this.unitOfWork.run(async context => {
                const repo = transactionRepository(context, Synthesis)
                const existing = await repo.findOne({ where: { id, userId } })
                if (!existing) {
                    throw applicationError(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED)
                }
                const result = await repo.update({ id, userId }, toSynthesisPatch(input))
                if ((result.affected ?? 0) === 0) {
                    throw applicationError(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED)
                }
                return this.findOneWithRepository(repo, id, userId, fieldsMap)
            })
        } catch (error) {
            return throwSynthPersistenceError(error)
        }
    }

    async delete(id: UUID, userId: UUID): Promise<SynthCommandResult> {
        try {
            return await this.unitOfWork.run(async context => {
                const repo = transactionRepository(context, Synthesis)
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

    async findAllByUser(userId: UUID, fieldsMap: GraphQLFieldsMap): Promise<Synthesis[]> {
        const scalarFields = GraphQLUtils.getScalarFields(fieldsMap);
        const columns = GraphQLUtils.ensureRequiredFields(scalarFields, ['id', 'title'])
        let qb = this.routeRepo.createQueryBuilder('synthesis')
            .select(columns.map(col => `synthesis.${col}`))
            .where('synthesis.user_id = :userId', { userId })
            .orderBy('synthesis.title', 'ASC');
        qb = SynthSelectionPlanner.applyForSynthesis(qb, this.routeRepo.metadata, fieldsMap)
        return qb.getMany()
    }

    async findOne(id: UUID, userId: UUID, fieldsMap: GraphQLFieldsMap): Promise<Synthesis | null> {
        return this.findOneWithRepository(this.routeRepo, id, userId, fieldsMap)
    }

    private async findOneWithRepository(
        repo: Repository<Synthesis>,
        id: UUID,
        userId: UUID,
        fieldsMap: GraphQLFieldsMap
    ): Promise<Synthesis | null> {
        const scalarFields = GraphQLUtils.getScalarFields(fieldsMap);
        const columns = GraphQLUtils.ensureRequiredFields(scalarFields, ['id', 'title'])
        let qb = repo.createQueryBuilder('synthesis')
            .select(columns.map(col => `synthesis.${col}`))
            .where('synthesis.id = :id', { id })
            .andWhere('synthesis.user_id = :userId', { userId })
        qb = SynthSelectionPlanner.applyForSynthesis(qb, repo.metadata, fieldsMap)
        return qb.getOne()
    }
}
