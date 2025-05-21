import { TotpDTO } from './totp.cls.dto';

describe('TotpDTO', () => {
  it('should store totp and secure token', () => {
    const dto = new TotpDTO();
    dto.totp = '654321';
    dto.secureToken = 'aaa.bbb.ccc';
    expect(dto.totp).toBe('654321');
    expect(dto.secureToken).toBe('aaa.bbb.ccc');
  });
});
