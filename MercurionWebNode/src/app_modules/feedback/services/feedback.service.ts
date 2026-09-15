import { Injectable } from '@nestjs/common';

import { UUID } from 'node:crypto';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import { CreateFeedbackDTO } from '../models/dto/create-feedback.dto';
import { Feedback } from '../models/entities/feedback.entity';
import { FeedbackContextKind, FeedbackEnv, FeedbackKind, FeedbackSource, FeedbackStatus } from '../models/enums/feedback.enums';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateFeedbackDTO } from '../models/dto/update-feedback.dto';
import { IPaginationOptions, paginate, Pagination } from 'nestjs-typeorm-paginate';
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'
import { redisDurations, redisKeys } from 'src/app_modules/redis/contracts/redis-contracts'
import type { Feedback as FeedbackContract } from '@mercurion/rest-contracts'
import { utcInstantFromEpochMs } from 'src/utils/temporal/temporal'

@Injectable()
export class FeedbackService {

    private readonly FEEDBACK_SEND_WINDOW = redisDurations.minutes(10)
    private readonly FEEDBACK_MAX_SENDS = 8

    private readonly FEEDBACK_LOCK = redisDurations.minutes(15)

    constructor(
        private readonly redisService: RedisService,
        @InjectRepository(Feedback)
        private readonly feedbackRepo: Repository<Feedback>
    ) { }

    private toPublicFeedback(feedback: Feedback): FeedbackContract {
        return {
            id: feedback.id,
            createdAtMs: utcInstantFromEpochMs(Number(feedback.createdAtMs)),
            env: feedback.env,
            source: feedback.source,
            kind: feedback.kind,
            ratingUtility: feedback.ratingUtility,
            ratingClarity: feedback.ratingClarity,
            ratingExperience: feedback.ratingExperience,
            message: feedback.message,
            contextKind: feedback.contextKind,
            contextRef: feedback.contextRef,
            contextMeta: feedback.contextMeta,
            clientVersion: feedback.clientVersion,
            status: feedback.status,
            internalNote: feedback.internalNote,
            tags: feedback.tags
        }
    }

    private async ensureFeedbackNotLocked(userId: UUID): Promise<void> {
        const lockKey = redisKeys.feedback.sendLock(userId)
        const locked = await this.redisService.exists(lockKey)
        if (locked) {
            throw applicationError(ApplicationErrorCode.FEEDBACK_TOO_MANY_REQUESTS)
        }
    }

    private async registerFeedbackSend(userId: UUID): Promise<void> {
        const sendKey = redisKeys.feedback.sendCount(userId)
        const lockKey = redisKeys.feedback.sendLock(userId)

        const sends = await this.redisService.incr(sendKey)

        if (sends === 1) {
            await this.redisService.setTTL(sendKey, this.FEEDBACK_SEND_WINDOW)
        }

        if (sends >= this.FEEDBACK_MAX_SENDS) {
            await this.redisService.set(lockKey, '1', this.FEEDBACK_LOCK)
            await this.redisService.del(sendKey)
        }
    }

    private async clearFeedbackLock(userId: UUID): Promise<void> {
        const sendKey = redisKeys.feedback.sendCount(userId)
        const lockKey = redisKeys.feedback.sendLock(userId)
        await this.redisService.del(sendKey)
        await this.redisService.del(lockKey)
    }

    async createFeedback(dto: CreateFeedbackDTO, userId: UUID): Promise<FeedbackContract> {

        await this.ensureFeedbackNotLocked(userId)

        const feedback = new Feedback()
        feedback.userId = userId

        feedback.env = dto.env
        feedback.source = dto.source ?? FeedbackSource.MANUAL_PAGE
        feedback.kind = dto.kind ?? FeedbackKind.OTHER

        feedback.contextKind = dto.contextKind ?? FeedbackContextKind.GLOBAL
        feedback.contextRef = dto.contextRef ?? null
        feedback.contextMeta = dto.contextMeta ?? null
        feedback.clientVersion = dto.clientVersion ?? null

        feedback.ratingUtility = dto.ratingUtility ?? null
        feedback.ratingClarity = dto.ratingClarity ?? null
        feedback.ratingExperience = dto.ratingExperience ?? null
        feedback.message = dto.message ?? null

        const saved = await this.feedbackRepo.save(feedback)

        await this.registerFeedbackSend(userId)

        return this.toPublicFeedback(saved)
    }

    async getFeedbackById(id: UUID): Promise<FeedbackContract | null> {
        const feedback = await this.feedbackRepo.findOne({
            where: { id }
        })
        return feedback ? this.toPublicFeedback(feedback) : null
    }

    async listFeedback(
        options: IPaginationOptions,
        filters?: {
            env?: FeedbackEnv
            status?: FeedbackStatus
        }
    ): Promise<Pagination<FeedbackContract>> {
        const where: Record<string, unknown> = {}

        if (filters?.env) {
            where.env = filters.env
        }

        if (filters?.status) {
            where.status = filters.status
        }

        const page = await paginate(this.feedbackRepo, options, {
            where,
            order: {
                createdAtMs: 'DESC'
            }
        })
        return {
            ...page,
            items: page.items.map(feedback => this.toPublicFeedback(feedback))
        }
    }

    async moderateFeedback(id: UUID, dto: UpdateFeedbackDTO): Promise<FeedbackContract> {
        const feedback = await this.feedbackRepo.findOne({
            where: { id }
        })

        if (!feedback) {
            throw applicationError(ApplicationErrorCode.FEEDBACK_NOT_FOUND)
        }

        if (dto.status !== undefined) {
            feedback.status = dto.status
        }

        if (dto.internalNote !== undefined) {
            feedback.internalNote = dto.internalNote
        }

        if (dto.tags !== undefined) {
            feedback.tags = dto.tags
        }

        const saved = await this.feedbackRepo.save(feedback)
        return this.toPublicFeedback(saved)
    }

    async deleteFeedback(id: UUID): Promise<void> | never {
        const res = await this.feedbackRepo.delete({ id })
        if (!res.affected) {
            throw applicationError(ApplicationErrorCode.FEEDBACK_NOT_FOUND)
        }
    }


}
