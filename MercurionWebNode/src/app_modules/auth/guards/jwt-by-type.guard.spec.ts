import { JwtByTypeGuard } from './jwt-by-type.guard';

describe('JwtByTypeGuard', () => {
  it('should be defined', () => {
    expect(new JwtByTypeGuard()).toBeDefined();
  });
});
