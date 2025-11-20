import { Module, forwardRef } from '@nestjs/common';
import { HistoryService } from './services/history.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { History } from './Models/entities/history.entity';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';
import { HistoryController } from './controllers/history.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([History]),
    forwardRef(() => UserModule),
    forwardRef(() => MeilisearchModule)
  ],
  providers: [HistoryService],
  exports: [TypeOrmModule, HistoryService],
  controllers: [HistoryController]
})
export class HistoryModule { }
