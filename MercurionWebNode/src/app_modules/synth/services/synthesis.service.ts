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

@Injectable()
export class SynthesisService {

    constructor(
        @InjectRepository(Synthesis)
        private readonly routeRepo: Repository<Synthesis>,
    ) { }

    async create(userId: UUID, input: SynthesisInput): Promise<Synthesis> {
        const route = this.routeRepo.create({
            userId,
            title: input.title,
            notes: input.notes ?? null
        })
        try {
            return await this.routeRepo.save(route)
        } catch (error) {
            return throwSynthPersistenceError(error)
        }
    }

    async update(id: UUID, userId: UUID, input: SynthesisInput, fieldsMap: GraphQLFieldsMap): Promise<Synthesis | null> {
        try {
            const result = await this.routeRepo.update({ id, userId }, {
                title: input.title,
                notes: input.notes ?? null
            })
            if ((result.affected ?? 0) === 0) {
                throw applicationError(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED)
            }
            return this.findOne(id, userId, fieldsMap)
        } catch (error) {
            return throwSynthPersistenceError(error)
        }
    }

    async delete(id: UUID, userId: UUID): Promise<SynthCommandResult> {
        try {
            const result = await this.routeRepo.delete({ id, userId })
            if ((result.affected ?? 0) === 0) {
                throw applicationError(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED)
            }
            return { success: true, outcome: SynthCommandOutcome.Deleted }
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
        const scalarFields = GraphQLUtils.getScalarFields(fieldsMap);
        const columns = GraphQLUtils.ensureRequiredFields(scalarFields, ['id', 'title'])
        let qb = this.routeRepo.createQueryBuilder('synthesis')
            .select(columns.map(col => `synthesis.${col}`))
            .where('synthesis.id = :id', { id })
            .andWhere('synthesis.user_id = :userId', { userId })
        qb = SynthSelectionPlanner.applyForSynthesis(qb, this.routeRepo.metadata, fieldsMap)
        return qb.getOne()
    }
}
