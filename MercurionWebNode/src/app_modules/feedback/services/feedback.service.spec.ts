import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import { Feedback } from '../Models/entities/feedback.entity';
import { FeedbackService } from './feedback.service';

describe('FeedbackService', () => {
  let service: FeedbackService;

  const redisServiceMock = {
    exists: jest.fn(),
    getClient: jest.fn(() => ({ incr: jest.fn() })),
    setTTL: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const feedbackRepoMock = {
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: RedisService, useValue: redisServiceMock },
        { provide: getRepositoryToken(Feedback), useValue: feedbackRepoMock },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
