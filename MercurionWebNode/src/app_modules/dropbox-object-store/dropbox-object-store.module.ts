import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from './Models/entities/document.entity';
import { DropboxObjectStoreService } from './services/dropbox-object-store.service';
import { OAuth2ClientModule } from '../oauth2-client/oauth2-client.module';
import { DocumentController } from './controllers/document.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity]), OAuth2ClientModule],
  providers: [DropboxObjectStoreService],
  controllers: [DocumentController]
})
export class DropboxObjectStoreModule { }
