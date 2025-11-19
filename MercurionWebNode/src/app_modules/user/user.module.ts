import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './Models/entities/user.entity';
import { MfaBackupCode } from './Models/entities/backup-code.entity';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';
import { AuthModule } from '../auth/auth.module';
import { History } from '../history/Models/entities/history.entity';
import { MoleculeCollectionModule } from '../molecule-collection/molecule-collection.module';
import { HistoryModule } from '../history/history.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      MfaBackupCode,
      History
    ]),
    forwardRef(() => MeilisearchModule),
    forwardRef(() => AuthModule),
    forwardRef(() => MoleculeCollectionModule),
    forwardRef(() => HistoryModule)
  ],
  providers: [
    UserService
  ],
  exports: [UserService, TypeOrmModule]
})
export class UserModule { }
