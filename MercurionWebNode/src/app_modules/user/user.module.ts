import { Global, Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './Models/entities/user.entity';
import { MfaBackupCode } from './Models/entities/backup-code.entity';
import { History } from '../history/Models/entities/history.entity';
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
