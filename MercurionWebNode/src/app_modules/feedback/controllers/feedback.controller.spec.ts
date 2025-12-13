import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from '../services/feedback.service';

describe('FeedbackController', () => {
  let controller: FeedbackController;

  const feedbackServiceMock = {
    createFeedback: jest.fn(),
    listFeedback: jest.fn(),
    getFeedbackById: jest.fn(),
    moderateFeedback: jest.fn(),
    deleteFeedback: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedbackController],
      providers: [{ provide: FeedbackService, useValue: feedbackServiceMock }],
    }).compile();

    controller = module.get<FeedbackController>(FeedbackController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
