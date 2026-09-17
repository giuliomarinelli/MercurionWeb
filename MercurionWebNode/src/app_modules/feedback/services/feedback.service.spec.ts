import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AtomicAttemptPolicyService } from 'src/app_modules/redis/services/atomic-attempt-policy.service';
import { Feedback } from '../models/entities/feedback.entity';
import { FeedbackService } from './feedback.service';

describe('FeedbackService', () => {
  let service: FeedbackService;

  const feedbackRepoMock = {
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: AtomicAttemptPolicyService, useValue: {} },
        { provide: getRepositoryToken(Feedback), useValue: feedbackRepoMock },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
