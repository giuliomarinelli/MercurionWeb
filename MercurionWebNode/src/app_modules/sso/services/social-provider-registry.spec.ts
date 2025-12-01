import { SocialProviderRegistry } from './social-provider-registry';
import { AuthProvider } from '../Models/enums/auth-provider.enum';

describe('SocialProviderRegistryService', () => {
  it('should be defined', () => {
    const mockClient = {
      getAuthorizationUrl: jest.fn(),
      getProfileFromCode: jest.fn(),
    };
    const registry = new SocialProviderRegistry(
      mockClient as any,
      mockClient as any,
      mockClient as any,
      mockClient as any,
    );
    expect(registry.get(AuthProvider.Google)).toBeDefined();
  });
});
