import { Injectable } from '@nestjs/common';

import { UUID } from 'node:crypto';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import { CreateFeedbackDTO } from '../Models/DTO/create-feedback.dto';
import { Feedback } from '../Models/entities/feedback.entity';
import { FeedbackContextKind, FeedbackEnv, FeedbackKind, FeedbackSource, FeedbackStatus } from '../Models/enums/feedback.enums';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateFeedbackDTO } from '../Models/DTO/update-feedback.dto';
import { IPaginationOptions, paginate, Pagination } from 'nestjs-typeorm-paginate';
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'

@Injectable()
export class FeedbackService {

    private readonly FEEDBACK_SEND_WINDOW_SECONDS = 10 * 60
    private readonly FEEDBACK_MAX_SENDS = 8

    private readonly FEEDBACK_LOCK_SECONDS = 15 * 60

    constructor(
        private readonly redisService: RedisService,
        @InjectRepository(Feedback)
        private readonly feedbackRepo: Repository<Feedback>
    ) { }

    private getFeedbackSendKey(userId: UUID): string {
        return `feedback:send:count:${userId}`
    }

    private getFeedbackLockKey(userId: UUID): string {
        return `feedback:send:lock:${userId}`
    }

    private async ensureFeedbackNotLocked(userId: UUID): Promise<void> {
        const lockKey = this.getFeedbackLockKey(userId)
        const locked = await this.redisService.exists(lockKey)
        if (locked) {
            throw applicationError(ApplicationErrorCode.FEEDBACK_TOO_MANY_REQUESTS)
        }
    }

    private async registerFeedbackSend(userId: UUID): Promise<void> {
        const sendKey = this.getFeedbackSendKey(userId)
        const lockKey = this.getFeedbackLockKey(userId)

        const sends = await this.redisService.getClient().incr(sendKey)

        if (sends === 1) {
            await this.redisService.setTTL(sendKey, this.FEEDBACK_SEND_WINDOW_SECONDS)
        }

        if (sends >= this.FEEDBACK_MAX_SENDS) {
            await this.redisService.set(lockKey, '1', this.FEEDBACK_LOCK_SECONDS)
            await this.redisService.del(sendKey)
        }
    }

    private async clearFeedbackLock(userId: UUID): Promise<void> {
        const sendKey = this.getFeedbackSendKey(userId)
        const lockKey = this.getFeedbackLockKey(userId)
        await this.redisService.del(sendKey)
        await this.redisService.del(lockKey)
    }

    async createFeedback(dto: CreateFeedbackDTO, userId: UUID): Promise<Feedback> {

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

        return saved
    }

    async getFeedbackById(id: UUID): Promise<Feedback | null> {
        return this.feedbackRepo.findOne({
            where: { id }
        })
    }

    async listFeedback(
        options: IPaginationOptions,
        filters?: {
            env?: FeedbackEnv
            status?: FeedbackStatus
        }
    ): Promise<Pagination<Feedback>> {
        const where: Record<string, unknown> = {}

        if (filters?.env) {
            where.env = filters.env
        }

        if (filters?.status) {
            where.status = filters.status
        }

        return paginate(this.feedbackRepo, options, {
            where,
            order: {
                createdAtMs: 'DESC'
            }
        })
    }

    async moderateFeedback(id: UUID, dto: UpdateFeedbackDTO): Promise<Feedback> {
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

        return this.feedbackRepo.save(feedback)
    }

    async deleteFeedback(id: UUID): Promise<void> | never {
        const res = await this.feedbackRepo.delete({ id })
        if (!res.affected) {
            throw applicationError(ApplicationErrorCode.FEEDBACK_NOT_FOUND)
        }
    }


}
