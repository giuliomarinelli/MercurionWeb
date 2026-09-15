import { TestPhoneDTO } from './test-phone.cls.dto';

describe('TestPhoneDTO', () => {
  it('should optionally hold a complete phone number', () => {
    const dto = new TestPhoneDTO();
    dto.completePhoneNumber = '+390123456789';
    expect(dto.completePhoneNumber).toBe('+390123456789');
  });
});
