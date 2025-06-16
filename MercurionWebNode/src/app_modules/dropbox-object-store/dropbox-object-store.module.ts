import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from './Models/entities/document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity])],
  providers: []
})
export class DropboxObjectStoreModule {}
