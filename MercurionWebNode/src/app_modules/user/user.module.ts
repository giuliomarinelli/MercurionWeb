import { Global, Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './models/entities/user.entity';
import { MfaBackupCode } from './models/entities/backup-code.entity';
import { History } from '../history/models/entities/history.entity';
import { MfaBackupCodeStore } from './services/mfa-backup-code.store';


@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      MfaBackupCode,
      History
    ]),
  ],
  providers: [
    UserService,
    MfaBackupCodeStore
  ],
  exports: [UserService, MfaBackupCodeStore]
})
export class UserModule { }
