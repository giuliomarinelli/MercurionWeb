import { Global, Module } from '@nestjs/common';
import { HistoryService } from './services/history.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { History } from './Models/entities/history.entity';
import { HistoryController } from './controllers/history.controller';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([History]),
  ],
  providers: [HistoryService],
  exports: [TypeOrmModule, HistoryService],
  controllers: [HistoryController]
})
export class HistoryModule { }
