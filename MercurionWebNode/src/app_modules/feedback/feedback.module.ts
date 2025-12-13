import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feedback } from './Models/entities/feedback.entity';
import { FeedbackService } from './services/feedback.service';
import { RedisModule } from '../redis/redis.module';
import { FeedbackController } from './controllers/feedback.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([Feedback]),
        RedisModule
    ],
    providers: [FeedbackService],
    controllers: [FeedbackController]
})
export class FeedbackModule { }
