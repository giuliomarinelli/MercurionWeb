import { ChangePhoneDTO } from './change-phone.cls.dto';

describe('ChangePhoneDTO', () => {
  it('should store international prefix and phone number', () => {
    const dto = new ChangePhoneDTO();
    dto.internationalPrefix = '+39';
    dto.phoneNumber = '1234567890';
    expect(dto.internationalPrefix).toBe('+39');
    expect(dto.phoneNumber).toBe('1234567890');
  });
});
