import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './Models/entities/user.entity';
import { BackupCode } from './Models/entities/backup-code.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, BackupCode])],
  providers: [UserService],
  exports: [UserService]
})
export class UserModule { }
