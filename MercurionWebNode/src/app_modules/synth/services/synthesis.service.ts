import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UUID } from "crypto";
import { GraphQLUtils } from "src/utils/graphql-utils/graphql-utils";
import { GraphQLFieldsMap } from "src/utils/type-orm-utils/type-orm-utils";
import { Synthesis } from "../models/entities/synthesis.entity";
import { SynthesisInput } from "../models/dto/synthesis.input";
import { SynthSelectionPlanner } from './synth-selection-planner';

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
        return this.routeRepo.save(route)
    }

    async update(id: UUID, userId: UUID, input: SynthesisInput, fieldsMap: GraphQLFieldsMap): Promise<Synthesis | null> {
        await this.routeRepo.update({ id, userId }, {
            title: input.title,
            notes: input.notes ?? null
        })
        return this.findOne(id, userId, fieldsMap)
    }

    async delete(id: UUID, userId: UUID): Promise<boolean> {
        try {
            await this.routeRepo.delete({ id, userId })
            return true
        } catch {
            return false
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
