import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UseInterceptors,
    ClassSerializerInterceptor,
    Query,
    ParseUUIDPipe,
    ParseIntPipe,
    DefaultValuePipe
} from '@nestjs/common'
import { UUID } from 'crypto'
import { FeedbackService } from '../services/feedback.service'
import { AuthenticatedUserId, HasScopes } from 'src/metadata/metadata'
import { CreateFeedbackDTO } from '../Models/DTO/create-feedback.dto'
import { Scope } from 'src/app_modules/user/Models/enums/scope.enum'
import { UpdateFeedbackDTO } from '../Models/DTO/update-feedback.dto'
import { FeedbackEnv, FeedbackStatus } from '../Models/enums/feedback.enums'
import {
    ApplicationErrorCode,
    applicationHttpException,
    isApplicationError
} from 'src/exception-handling/application-error'
import { FlatPagination } from 'src/Models/flat-pagination.interface'
import type { DeleteFeedbackResponse, Feedback as FeedbackDTO } from '@mercurion/rest-contracts'


@Controller('feedback')
@UseInterceptors(ClassSerializerInterceptor)
export class FeedbackController {

    constructor(private readonly feedbackService: FeedbackService) { }

    @Post()
    async create(
        @Body() dto: CreateFeedbackDTO,
        @AuthenticatedUserId() userId: UUID
    ): Promise<FeedbackDTO> {
        return this.feedbackService.createFeedback(dto, userId)
    }

    @Get()
    @HasScopes(Scope.ReadFeedback)
    async list(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limitRaw: number,
        @Query('env') env?: FeedbackEnv,
        @Query('status') status?: FeedbackStatus
    ): Promise<FlatPagination<FeedbackDTO>> {
        const limit = Math.min(limitRaw, 100)
        const pagination = await this.feedbackService.listFeedback(
            { page, limit },
            { env, status }
        )

        return {
            items: pagination.items,
            itemCount: pagination.meta.itemCount,
            itemsPerPage: pagination.meta.itemsPerPage,
            totalItems: pagination.meta.totalItems ?? -1,
            totalPages: pagination.meta.totalPages ?? -1,
            currentPage: pagination.meta.currentPage
        }
    }

    @Get(':id')
    @HasScopes(Scope.ReadFeedback)
    async getById(@Param('id', new ParseUUIDPipe({ version: '7' })) id: UUID): Promise<FeedbackDTO> | never {
        const f = await this.feedbackService.getFeedbackById(id)
        if (!f) {
            throw applicationHttpException(ApplicationErrorCode.FEEDBACK_NOT_FOUND)
        }
        return f
    }

    @Patch(':id')
    @HasScopes(Scope.UpdateFeedback)
    async moderate(
        @Param('id', new ParseUUIDPipe({ version: '7' })) id: UUID,
        @Body() dto: UpdateFeedbackDTO
    ): Promise<FeedbackDTO> {
        return this.feedbackService.moderateFeedback(id, dto)
    }

    @Delete(':id')
    @HasScopes(Scope.DeleteFeedback)
    async delete(@Param('id', new ParseUUIDPipe({ version: '7' })) id: UUID): Promise<DeleteFeedbackResponse> {
        try {
            await this.feedbackService.deleteFeedback(id)
            return { ok: true }
        } catch (e) {
            if (isApplicationError(e, ApplicationErrorCode.FEEDBACK_NOT_FOUND)) {
                return { ok: false }
            }
            throw e
        }
    }

}
