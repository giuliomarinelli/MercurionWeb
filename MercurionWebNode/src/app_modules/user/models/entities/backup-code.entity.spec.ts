import { MfaBackupCode } from './backup-code.entity';

describe('MfaBackupCode', () => {
  it('should instantiate backup code entity', () => {
    const entity = new MfaBackupCode();
    expect(entity).toBeInstanceOf(MfaBackupCode);
  });
});
