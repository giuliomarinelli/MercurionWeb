import { Controller, Get, Query } from '@nestjs/common';
import { UUID } from 'crypto';
import { Pagination } from 'nestjs-typeorm-paginate';
import { AuthenticatedUserId } from 'src/metadata/metadata';
import { HistoryDTO } from '../Models/DTO/history.dto';
import { HistoryService } from '../services/history.service';

@Controller('history')
export class HistoryController {

constructor(
        private readonly historyService: HistoryService
    ) { }

    @Get()
    async getHistory(
        @AuthenticatedUserId() userId: UUID,
        @Query('page') page = 1,
        @Query('limit') limit = 20
    ): Promise<Pagination<HistoryDTO>> {
        return this.historyService.getPaginatedHistory(userId, {
            page, limit
        })
    }

}
