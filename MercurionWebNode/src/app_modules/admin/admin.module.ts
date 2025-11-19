import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';
import { ResponseService } from 'src/services/response.service';

@Module({
  imports: [MeilisearchModule],
  controllers: [AdminController],
  providers: [ResponseService]
})
export class AdminModule { }
