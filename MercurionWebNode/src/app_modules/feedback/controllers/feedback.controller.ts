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
    Query
} from '@nestjs/common'
import { UUID } from 'crypto'
import { FeedbackService } from '../services/feedback.service'
import { AuthenticatedUserId, HasScopes } from 'src/metadata/metadata'
import { CreateFeedbackDTO } from '../Models/DTO/create-feedback.dto'
import { Scope } from 'src/app_modules/user/Models/enums/scope.enum'
import { UpdateFeedbackDTO } from '../Models/DTO/update-feedback.dto'
import { FeedbackEnv, FeedbackStatus } from '../Models/enums/feedback.enums'
import { Feedback } from '../Models/entities/feedback.entity'
import { IPaginationMeta, Pagination } from 'nestjs-typeorm-paginate'


@Controller('feedback')
@UseInterceptors(ClassSerializerInterceptor)
export class FeedbackController {

    constructor(private readonly feedbackService: FeedbackService) { }

    @Post()
    async create(
        @Body() dto: CreateFeedbackDTO,
        @AuthenticatedUserId() userId: UUID
    ): Promise<Feedback> {
        return this.feedbackService.createFeedback(dto, userId)
    }

    @Get()
    @HasScopes(Scope.ReadFeedback)
    async list(
        @Query('page') pageRaw?: string,
        @Query('limit') limitRaw?: string,
        @Query('env') env?: FeedbackEnv,
        @Query('status') status?: FeedbackStatus
    ): Promise<Pagination<Feedback, IPaginationMeta>> {
        const page = Math.max(1, Number(pageRaw ?? 1) || 1)
        const limitUnsafe = Math.max(1, Number(limitRaw ?? 25) || 25)
        const limit = Math.min(limitUnsafe, 100)

        return this.feedbackService.listFeedback(
            { page, limit },
            { env, status }
        )
    }

    @Patch(':id')
    @HasScopes(Scope.UpdateFeedback)
    async moderate(
        @Param('id') id: string,
        @Body() dto: UpdateFeedbackDTO
    ): Promise<Feedback> {
        return this.feedbackService.moderateFeedback(id, dto)
    }

    @Delete(':id')
    @HasScopes(Scope.DeleteFeedback)
    async delete(@Param('id') id: string): Promise<{ ok: boolean }> {
        try {
            await this.feedbackService.deleteFeedback(id)
            return { ok: true }
        } catch {
            return { ok: false }
        }
    }

}
