import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './Models/entities/user.entity';
import { MfaBackupCode } from './Models/entities/backup-code.entity';
import { ChEMBLMoleculeItemEntity } from './Models/entities/chembl-molecule-item.entity';
import { CustomMoleculeItemEntity } from './Models/entities/custom-molecule-item.entity';
import { MoleculeCollection } from './Models/entities/molecule-collection.entity';
import { MoleculeCollectionItemJoin } from './Models/entities/molecule-collection-item-join.entity';
import { MoleculeCollectionItemEntity } from './Models/entities/molecule-collection-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    User, 
    MfaBackupCode,
    ChEMBLMoleculeItemEntity,
    CustomMoleculeItemEntity,
    MoleculeCollection,
    MoleculeCollectionItemJoin,
    MoleculeCollectionItemEntity
  ])],
  providers: [UserService],
  exports: [UserService, TypeOrmModule]
})
export class UserModule { }
