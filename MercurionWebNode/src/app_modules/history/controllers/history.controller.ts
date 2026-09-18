import { Controller, DefaultValuePipe, Delete, Get, ParseIntPipe, Query } from '@nestjs/common';
import { UUID } from 'crypto';
import { FlatPagination } from 'src/models/flat-pagination.interface';
import { AuthenticatedUserId } from 'src/metadata/metadata';
import { HistoryDTO } from '../models/dto/history.dto';
import { HistoryService } from '../services/history.service';
import { LoggerContext } from 'src/logging/logger.port';
import { LoggerPort } from 'src/logging/logger.port';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';

@Controller('history')
export class HistoryController {

    private readonly logger: LoggerContext

    constructor(
        private readonly historyService: HistoryService,
        loggerFactory: LoggerPort
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
            return GeneralUtils.paginationToFlatPaginationConverter(pagination)
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
