import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtByTypeGuard } from './jwt-by-type.guard';
import { JwtToolsService } from '../services/jwt-tools.service';

describe('JwtByTypeGuard', () => {
  let guard: JwtByTypeGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtByTypeGuard,
        { provide: Reflector, useValue: { get: jest.fn() } },
        { provide: JwtToolsService, useValue: {} },
      ],
    }).compile();

    guard = module.get<JwtByTypeGuard>(JwtByTypeGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });
});
