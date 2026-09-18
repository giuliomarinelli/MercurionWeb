import { Global, Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './models/entities/user.entity';
import { MfaBackupCode } from './models/entities/backup-code.entity';
import { History } from '../history/models/entities/history.entity';
import { HistoryModule } from '../history/history.module';
import { MfaBackupCodeStore } from './services/mfa-backup-code.store';
import { ProfileReadModelService } from './services/profile-read-model.service';


@Global()
@Module({
  imports: [
    HistoryModule,
    TypeOrmModule.forFeature([
      User,
      MfaBackupCode,
      History
    ]),
  ],
  providers: [
    UserService,
    MfaBackupCodeStore,
    ProfileReadModelService
  ],
  exports: [UserService, MfaBackupCodeStore]
})
export class UserModule { }
