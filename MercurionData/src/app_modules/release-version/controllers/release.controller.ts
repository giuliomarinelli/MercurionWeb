import { BadRequestException, Body, Controller, Get, HttpStatus, Param, Post, Query, Res, ValidationPipe } from '@nestjs/common';
import { ReleaseService } from '../services/release.service';
import { FlatPagination } from '../Models/DTO/flat-pagination.dto';
import { ReleaseVersion } from '../Models/entities/release-version.entity';
import { paginationToFlatPaginationConverter } from '../helpers/pagination-to-flat-pagination.converter';
import { CreateReleaseVersionDTO } from '../Models/DTO/create-release-version.dto';
import { ReleaseResponseDTO } from '../Models/DTO/release-and-path.dto';
import { ReleaseContext } from '../Models/enums/release-context.enum';
import { type Response } from 'express';

@Controller('release')
export class ReleaseController {

    constructor(private readonly releaseService: ReleaseService) { }

    private validateContext(context: string): context is ReleaseContext {
        return Object.values(ReleaseContext).includes(context as ReleaseContext)
    }

    @Get()
    async getAllPaginated(
        @Query('page') pageRaw = '1',
        @Query('limit') limitRaw = '20'
    ): Promise<FlatPagination<ReleaseVersion>> {

        const pageNum = Number(pageRaw)
        const limitNum = Number(limitRaw)

        const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1
        const limit = Number.isFinite(limitNum) && limitNum > 0 ? limitNum : 20
        const pagination = await this.releaseService.getAll({ page, limit })
        return paginationToFlatPaginationConverter(pagination)
    }

    @Post()
    async createVersion(
        @Body(new ValidationPipe({ transform: true })) dto: CreateReleaseVersionDTO
    ): Promise<ReleaseVersion> {
        return this.releaseService.createVersion(dto)
    }

    @Post('/write/:context')
    async writeLatestVersionToReleaseEnv(
        @Param('context') context: string | ReleaseContext,
        @Res({ passthrough: true }) res: Response
    ): Promise<ReleaseResponseDTO> {

        if (this.validateContext(context)) {
            try {
                const releaseAndPath = await this.releaseService.writeLatestVersionToReleaseEnv(context)
                res.status(HttpStatus.OK)
                return {
                    ...releaseAndPath,
                    ok: true
                }
            } catch (e) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                return {
                    ok: false,
                    detail: (e as Error)?.message || 'Unknown error'
                }
            }
        }
        throw new BadRequestException(`Inavlid context, acceptable values: ${Object.values(ReleaseContext).join(', ')}`)
    }

}
