import { Test, TestingModule } from '@nestjs/testing';
import { DiscordProviderClient } from './discord-provider-client';

describe('DiscordProviderClientService', () => {
  let service: DiscordProviderClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscordProviderClient],
    }).compile();

    service = module.get<DiscordProviderClient>(DiscordProviderClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
