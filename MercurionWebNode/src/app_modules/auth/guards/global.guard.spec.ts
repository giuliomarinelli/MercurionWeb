import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { GlobalGuard } from './global.guard';
import { JwtToolsService } from '../services/jwt-tools.service';
import { SessionService } from '../services/session.service';

describe('GlobalGuard', () => {
  let guard: GlobalGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalGuard,
        { provide: JwtToolsService, useValue: {} },
        { provide: SessionService, useValue: {} },
        { provide: Reflector, useValue: { get: jest.fn() } },
      ],
    }).compile();

    guard = module.get<GlobalGuard>(GlobalGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });
});
