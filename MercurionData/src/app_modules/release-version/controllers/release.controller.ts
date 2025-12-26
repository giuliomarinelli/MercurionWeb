import { Body, Controller, Get, Post, ValidationPipe } from '@nestjs/common';
import { ReleaseService } from '../services/release.service';
import { FlatPagination } from '../Models/DTO/flat-pagination.dto';
import { ReleaseVersion } from '../Models/entities/release-version.entity';
import { paginationToFlatPaginationConverter } from '../helpers/pagination-to-flat-pagination.converter';
import { CreateReleaseVersionDTO } from '../Models/DTO/create-release-version.dto';

@Controller('release')
export class ReleaseController {

    constructor(private readonly releaseService: ReleaseService) { }

    @Get()
    async getAllPaginated(
        page = 1,
        limit = 20
    ): Promise<FlatPagination<ReleaseVersion>> {
        const pagination = await this.releaseService.getAll({ page, limit })
        return paginationToFlatPaginationConverter(pagination)
    }

    @Post()
    async createVersion(
        @Body(new ValidationPipe({ transform: true })) dto: CreateReleaseVersionDTO
    ): Promise<ReleaseVersion> {
        return this.releaseService.createVersion(dto)
    }

}
