import { Test, TestingModule } from '@nestjs/testing';
import { Oauth2ClientService } from './oauth2-client.service';

describe('Oauth2ClientService', () => {
  let service: Oauth2ClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Oauth2ClientService],
    }).compile();

    service = module.get<Oauth2ClientService>(Oauth2ClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
