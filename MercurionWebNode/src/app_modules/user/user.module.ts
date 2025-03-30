import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './Models/entities/user.entity';
import { MfaBackupCode } from './Models/entities/backup-code.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, MfaBackupCode])],
  providers: [UserService],
  exports: [UserService, TypeOrmModule]
})
export class UserModule { }
