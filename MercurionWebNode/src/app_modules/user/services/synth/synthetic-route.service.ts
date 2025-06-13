import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UUID } from "crypto";
import { GraphqlUtils } from "src/graphql-utils/graphql-utils";
import { GraphQLFieldsMap, TypeOrmUtils } from "src/type-orm-utils/type-orm-utils";
import { SyntheticRouteEntity } from "../../Models/entities/synth/synthetic-route.entity";
import { SyntheticRouteInput } from "../../Models/DTO/synth/synthetic-route.input";

@Injectable()
export class SyntheticRouteService {

    constructor(
        @InjectRepository(SyntheticRouteEntity)
        private readonly routeRepo: Repository<SyntheticRouteEntity>,
    ) { }

    async create(userId: UUID, input: SyntheticRouteInput): Promise<SyntheticRouteEntity> {
        const route = this.routeRepo.create({ ...input, userId })
        return this.routeRepo.save(route)
    }

    async update(id: UUID, userId: UUID, input: SyntheticRouteInput, fieldsMap: GraphQLFieldsMap): Promise<SyntheticRouteEntity | null> {
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

    async findAllByUser(userId: UUID, fieldsMap: GraphQLFieldsMap): Promise<SyntheticRouteEntity[]> {
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap);
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, ['id', 'title'])
        let qb = this.routeRepo.createQueryBuilder('route')
            .select(columns.map(col => `route.${col}`))
            .where('route.userId = :userId', { userId })
            .orderBy('route.title', 'ASC');
        qb = TypeOrmUtils.addJoins(qb, 'route', fieldsMap)
        return qb.getMany()
    }

    async findOne(id: UUID, userId: UUID, fieldsMap: GraphQLFieldsMap): Promise<SyntheticRouteEntity | null> {
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap);
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, ['id', 'title'])
        let qb = this.routeRepo.createQueryBuilder('route')
            .select(columns.map(col => `route.${col}`))
            .where('route.id = :id', { id })
            .andWhere('route.userId = :userId', { userId })
        qb = TypeOrmUtils.addJoins(qb, 'route', fieldsMap)
        return qb.getOne()
    }
}
