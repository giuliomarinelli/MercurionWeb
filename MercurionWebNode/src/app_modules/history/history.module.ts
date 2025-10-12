import { Module } from '@nestjs/common';
import { HistoryService } from './services/history.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { History } from './Models/entities/history.entity';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';
import { HistoryController } from './controllers/history.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([History]),
    UserModule,
    MeilisearchModule
  ],
  providers: [HistoryService],
  exports: [TypeOrmModule],
  controllers: [HistoryController]
})
export class HistoryModule {}
