import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from './models/entities/document.entity';
import { OAuth2ClientModule } from '../oauth2-client/oauth2-client.module';
import { DocumentController } from './controllers/document.controller';
import { DocumentCommandService } from './application/document-command.service';
import { ObjectStore } from './application/object-store.port';
import { DropboxObjectStoreAdapter } from './infrastructure/dropbox-object-store.adapter';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity]),
    OAuth2ClientModule
  ],
  providers: [
    DocumentCommandService,
    DropboxObjectStoreAdapter,
    { provide: ObjectStore, useExisting: DropboxObjectStoreAdapter },
  ],
  controllers: [DocumentController]
})
export class DropboxObjectStoreModule { }
