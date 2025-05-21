import { BadRequestException } from '@nestjs/common';
import { GeneralUtils } from './general-utils';
import { MfaStrategy } from 'src/app_modules/user/Models/enums/mfa-strategy.enum';

enum TestEnum {
  FIRST = 'first',
  SECOND = 'second',
}

describe('GeneralUtils', () => {
  it('should be defined', () => {
    expect(new GeneralUtils()).toBeDefined();
  });

  describe('getEnumValue', () => {
    it('returns the matching value when present', () => {
      const result = GeneralUtils.getEnumValue(TestEnum, 'first');
      expect(result).toBe(TestEnum.FIRST);
    });

    it('returns undefined for non existing values', () => {
      const result = GeneralUtils.getEnumValue(TestEnum, 'third');
      expect(result).toBeUndefined();
    });
  });

  describe('getEnumValueFromStringKey', () => {
    it('returns the correct enum value by key', () => {
      const result = GeneralUtils.getEnumValueFromStringKey(TestEnum, 'SECOND');
      expect(result).toBe(TestEnum.SECOND);
    });

    it('returns undefined for invalid keys', () => {
      const result = GeneralUtils.getEnumValueFromStringKey(TestEnum, 'UNKNOWN');
      expect(result).toBeUndefined();
    });
  });

  describe('validateMfaStrategy', () => {
    it('returns enum value when strategy key is valid', () => {
      const result = GeneralUtils.validateMfaStrategy('EMAIL_OTP');
      expect(result).toBe(MfaStrategy.EMAIL_OTP);
    });

    it('throws BadRequestException when strategy is undefined', () => {
      expect(() => GeneralUtils.validateMfaStrategy(undefined)).toThrow(BadRequestException);
    });

    it('throws BadRequestException when strategy is invalid', () => {
      expect(() => GeneralUtils.validateMfaStrategy('INVALID')).toThrow(BadRequestException);
    });
  });
});
