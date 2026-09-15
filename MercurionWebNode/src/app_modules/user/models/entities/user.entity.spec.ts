import { User } from './user.entity';

describe('User', () => {
  it('should create a user entity instance', () => {
    const user = new User();
    expect(user).toBeInstanceOf(User);
  });
});
