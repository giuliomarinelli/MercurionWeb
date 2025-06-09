import { Test, TestingModule } from '@nestjs/testing';
import { TurnstileGuard } from './turnstile.guard';
import { TurnstileService } from '../services/turnstile.service';

describe('TurnstileGuard', () => {
  let guard: TurnstileGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TurnstileGuard,
        { provide: TurnstileService, useValue: {} },
      ],
    }).compile();

    guard = module.get<TurnstileGuard>(TurnstileGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });
});
