import { SsoGuard } from './sso.guard';

describe('SsoGuard', () => {
  it('should be defined', () => {
    expect(new SsoGuard()).toBeDefined();
  });
});
