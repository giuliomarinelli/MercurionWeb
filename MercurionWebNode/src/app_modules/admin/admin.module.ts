import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';
import { ResponseModule } from 'src/services/response.module';

@Module({
  imports: [MeilisearchModule, ResponseModule],
  controllers: [AdminController],
})
export class AdminModule { }
