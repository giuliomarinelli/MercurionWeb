import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UUID } from "crypto";
import { GraphqlUtils } from "src/utils/graphql-utils/graphql-utils";
import { GraphQLFieldsMap, TypeOrmUtils } from "src/utils/type-orm-utils/type-orm-utils";
import { Synthesis } from "../Models/entities/synthesis.entity";
import { SynthesisInput } from "../Models/DTO/synthesis.input";

@Injectable()
export class SynthesisService {

    constructor(
        @InjectRepository(Synthesis)
        private readonly routeRepo: Repository<Synthesis>,
    ) { }

    async create(userId: UUID, input: SynthesisInput): Promise<Synthesis> {
        const route = this.routeRepo.create({ ...input, userId })
        return this.routeRepo.save(route)
    }

    async update(id: UUID, userId: UUID, input: SynthesisInput, fieldsMap: GraphQLFieldsMap): Promise<Synthesis | null> {
        await this.routeRepo.update({ id, userId }, { ...input })
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
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap);
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, ['id', 'title'])
        let qb = this.routeRepo.createQueryBuilder('route')
            .select(columns.map(col => `route.${col}`))
            .where('route.user_id = :userId', { userId })
            .orderBy('route.title', 'ASC');
        qb = TypeOrmUtils.addJoins(qb, 'route', fieldsMap)
        return qb.getMany()
    }

    async findOne(id: UUID, userId: UUID, fieldsMap: GraphQLFieldsMap): Promise<Synthesis | null> {
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap);
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, ['id', 'title'])
        let qb = this.routeRepo.createQueryBuilder('route')
            .select(columns.map(col => `route.${col}`))
            .where('route.id = :id', { id })
            .andWhere('route.user_id = :userId', { userId })
        qb = TypeOrmUtils.addJoins(qb, 'route', fieldsMap)
        return qb.getOne()
    }
}
