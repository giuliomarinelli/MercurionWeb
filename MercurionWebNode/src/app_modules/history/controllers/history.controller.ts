import { Controller, Delete, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { UUID } from 'crypto';
import { FlatPagination } from 'src/Models/flat-pagination.interface';
import { AuthenticatedUserId } from 'src/metadata/metadata';
import { HistoryDTO } from '../Models/DTO/history.dto';
import { HistoryService } from '../services/history.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';

@Controller('history')
export class HistoryController {

    private readonly logger: MeiliContextLogger

    constructor(
        private readonly historyService: HistoryService,
        loggerFactory: MeiliLoggerService
    ) {
        this.logger = loggerFactory.forContext(HistoryController.name)
    }

    @Get()
    async getHistory(
        @AuthenticatedUserId() userId: UUID,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number
    ): Promise<FlatPagination<HistoryDTO>> {
        try {
            const pagination = await this.historyService.getPaginatedHistory(userId, {
                page, limit
            })
            return {
                items: pagination.items,
                itemCount: pagination.meta.itemCount,
                itemsPerPage: pagination.meta.itemsPerPage,
                totalItems: pagination.meta.totalItems ?? -1,
                totalPages: pagination.meta.totalPages ?? -1,
                currentPage: pagination.meta.currentPage
            }
        } catch (e) {
            this.logger.warn('Error in history fetching', e as object)
            return ({
                items: [],
                itemCount: 0,
                itemsPerPage: 0,
                totalItems: 0,
                totalPages: 1,
                currentPage: 1
            })
        }
    }

    @Delete()
    async deleteHistory(@AuthenticatedUserId() userId: UUID): Promise<boolean> {
        return this.historyService.deleteHistory(userId)
    }

}
