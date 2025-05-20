import { Login_SecondStepDTO } from './login-second-step.cls.dto';

describe('Login_SecondStepDTO', () => {
  it('should accept a totp token', () => {
    const dto = new Login_SecondStepDTO();
    dto.totp = '123456';
    expect(dto.totp).toBe('123456');
  });
});
