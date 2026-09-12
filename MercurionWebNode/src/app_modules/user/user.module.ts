import { Global, Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './Models/entities/user.entity';
import { MfaBackupCode } from './Models/entities/backup-code.entity';
import { History } from '../history/Models/entities/history.entity';


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
    UserService
  ],
  exports: [UserService, TypeOrmModule]
})
export class UserModule { }
