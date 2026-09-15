import { Login_FirstStepDTO } from './login-first-step.cls.dto';

describe('Login_FirstStepDTO', () => {
  it('should store credentials and remember flag', () => {
    const dto = new Login_FirstStepDTO();
    dto.email = 'test@example.com';
    dto.password = 'secret';
    dto.remember = true;
    expect(dto.email).toBe('test@example.com');
    expect(dto.password).toBe('secret');
    expect(dto.remember).toBe(true);
  });
});
