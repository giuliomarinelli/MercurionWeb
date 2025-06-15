import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UUID } from "crypto";
import { GraphQLFieldsMap, TypeOrmUtils } from "src/type-orm-utils/type-orm-utils";
import { GraphqlUtils } from "src/graphql-utils/graphql-utils";
import { SyntheticStepEntity } from "../../Models/entities/synth/synthetic-step.entity";
import { SyntheticStepInput } from "../../Models/DTO/synth/synthetic-step.input";

@Injectable()
export class SyntheticStepService {

    private readonly REQUIRED_FIELDS = ['id', 'order', 'userId']

    constructor(
        @InjectRepository(SyntheticStepEntity)
        private readonly stepRepo: Repository<SyntheticStepEntity>
    ) { }

    async create(userId: UUID, input: SyntheticStepInput): Promise<SyntheticStepEntity> {
        const step = this.stepRepo.create({ ...input, userId })
        return this.stepRepo.save(step)
    }

    async update(userId: UUID, id: UUID, input: Partial<SyntheticStepInput>, fieldsMap: GraphQLFieldsMap): Promise<SyntheticStepEntity | null> {
        await this.stepRepo.update({ id, userId }, { ...input })
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

    async findOneById(userId: UUID, id: UUID, fieldsMap: GraphQLFieldsMap): Promise<SyntheticStepEntity | null> {
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
        const relationalFields = GraphqlUtils.getRelationalFields(fieldsMap)
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, this.REQUIRED_FIELDS)
        let qb = this.stepRepo.createQueryBuilder('step')
            .select(columns.map(col => `step.${col}`))
            .where('step.id = :id', { id })
            .andWhere('step.userId = :userId', { userId })
        if (relationalFields.includes('route')) {
            qb = TypeOrmUtils.addJoins(qb, 'route', fieldsMap)
        }
        if (relationalFields.includes('moleculeRefs')) {
            qb = TypeOrmUtils.addJoins(qb, 'moleculeRefs', fieldsMap)
        }
        return qb.getOne()
    }


    async findByRoute(userId: UUID, routeId: UUID, fieldsMap: GraphQLFieldsMap): Promise<SyntheticStepEntity[]> {
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
        const relationalFields = GraphqlUtils.getRelationalFields(fieldsMap)
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, this.REQUIRED_FIELDS)
        let qb = this.stepRepo.createQueryBuilder('step')
            .select(columns.map(col => `step.${col}`))
            .where('step.routeId = :routeId', { routeId })
            .andWhere('step.userId = :userId', { userId })
            .orderBy('step.order', 'ASC')
        if (relationalFields.includes('route')) {
            qb = TypeOrmUtils.addJoins(qb, 'route', fieldsMap)
        }
        if (relationalFields.includes('moleculeRefs')) {
            qb = TypeOrmUtils.addJoins(qb, 'moleculeRefs', fieldsMap)
        }
        return qb.getMany()
    }


}
