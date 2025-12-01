import { SocialAuthController } from './social-auth.controller';
import { SocialAuthService } from '../services/social-auth.service';
import { ConfigService } from '@nestjs/config';

describe('SocialAuthController', () => {
  it('should be defined', () => {
    const controller = new SocialAuthController(
      {
        getOauth2TempState: jest.fn(),
        getAuthorizationUrl: jest.fn(),
        validateCallbackState: jest.fn(),
        loginWithProvider: jest.fn(),
      } as unknown as SocialAuthService,
      {
        get: jest.fn().mockReturnValue('https://example.com'),
      } as unknown as ConfigService,
    );
    expect(controller).toBeDefined();
  });
});
