import { Controller, Delete, Get, Query } from '@nestjs/common';
import { UUID } from 'crypto';
import {  Pagination } from 'nestjs-typeorm-paginate';
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
        @Query('page') page = 1,
        @Query('limit') limit = 20
    ): Promise<Pagination<HistoryDTO>> {
        try {
            return this.historyService.getPaginatedHistory(userId, {
                page, limit
            })
        } catch (e) {
            this.logger.warn('Error in history fetching', e as object)
            return ({
                items: [],
                meta: {
                    itemCount: 0,
                    itemsPerPage: 0,
                    totalPages: 1,
                    currentPage: 1
                }
            })


        }
    }

    @Delete()
    async deleteHistory(@AuthenticatedUserId() userId: UUID): Promise<boolean> {
        return this.historyService.deleteHistory(userId)
    }

}
