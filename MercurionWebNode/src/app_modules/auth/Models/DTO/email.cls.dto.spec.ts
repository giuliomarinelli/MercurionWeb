import { EmailDTO } from './email.cls.dto';

describe('EmailDTO', () => {
  it('should store the provided email address', () => {
    const dto = new EmailDTO();
    dto.email = 'user@example.com';
    expect(dto.email).toBe('user@example.com');
  });
});
