import { UserRegisterDTO } from './user-register.cls.dto';

describe('UserRegisterDTO', () => {
  it('should store registration fields', () => {
    const dto = new UserRegisterDTO();
    dto.email = 'test@ex.com';
    dto.firstName = 'Foo';
    dto.lastName = 'Bar';
    expect(dto.email).toBe('test@ex.com');
    expect(dto.firstName).toBe('Foo');
    expect(dto.lastName).toBe('Bar');
  });
});
