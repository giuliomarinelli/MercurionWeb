import { Injectable, Logger, UnauthorizedException, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity } from '../Models/entities/document.entity';
import { OAuth2ClientService } from 'src/app_modules/oauth2-client/services/oauth2-client.service';
import { StorageType } from '../Models/enums/storage-type.enum';
import { UUID } from 'crypto';

@Injectable()
export class DropboxObjectStoreService {
    private readonly logger = new Logger(DropboxObjectStoreService.name);

    constructor(
        private readonly oauth2ClientService: OAuth2ClientService,
        @InjectRepository(DocumentEntity)
        private readonly documentRepo: Repository<DocumentEntity>
    ) { }

    /**
     * Prende il token globale dell'applicazione per Dropbox
     */
    private async getDropboxAccessToken(): Promise<string> {
        const token = await this.oauth2ClientService.getAccessToken(StorageType.Dropbox)
        if (!token) throw new UnauthorizedException('Dropbox access token not available')
        return token
    }

    /**
     * Upload file: carica su Dropbox, poi crea record DocumentEntity
     */
    async uploadFile(buffer: Buffer, originalName: string, mimeType: string, size: number, ownerUserId: UUID, note?: string, isPublic = false): Promise<DocumentEntity> {
        const accessToken = await this.getDropboxAccessToken();

        // Salva tutti i file in una cartella root per l'app
        const dropboxPath = `/mercurion/${Date.now()}_${originalName}`;
        const res = await axios.post(
            'https://content.dropboxapi.com/2/files/upload',
            buffer,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Dropbox-API-Arg': JSON.stringify({
                        path: dropboxPath,
                        mode: 'add',
                        autorename: true,
                        mute: false,
                        strict_conflict: false,
                    }),
                    'Content-Type': 'application/octet-stream',
                },
            }
        );

        const dropboxFile = res.data;
        // dropboxFile.id, dropboxFile.path_display, dropboxFile.size, ecc.

        // Crea record nel DB
        const document = this.documentRepo.create({
            userId: ownerUserId,
            storageType: StorageType.Dropbox,
            storagePath: dropboxFile.path_display,
            originalName,
            size,
            mimeType,
            note: note ?? null,
            isPublic,
            updatedAt: Date.now()
        });
        await this.documentRepo.save(document);
        return document;
    }

    /**
     * Download file: trova il record, verifica permessi, scarica da Dropbox
     */
    async downloadFile(documentId: string, requestingUserId: string): Promise<Buffer> {
        const document = await this.documentRepo.findOneBy({ id: documentId as any });
        if (!document) throw new NotFoundException('File non trovato');
        if (!document.isPublic && document.userId !== requestingUserId)
            throw new UnauthorizedException('Non hai accesso a questo file');

        const accessToken = await this.getDropboxAccessToken();

        const res = await axios.post(
            'https://content.dropboxapi.com/2/files/download',
            null,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Dropbox-API-Arg': JSON.stringify({ path: document.storagePath }),
                },
                responseType: 'arraybuffer'
            }
        );
        return Buffer.from(res.data);
    }

    /**
     * Elimina file (Dropbox + DB)
     */
    async deleteFile(documentId: UUID, requestingUserId: UUID): Promise<void> {
        const document = await this.documentRepo.findOneBy({ id: documentId })
        if (!document) throw new NotFoundException('File non trovato')
        if (!document.isPublic && document.userId !== requestingUserId)
            throw new UnauthorizedException('Non hai accesso a questo file')

        const accessToken = await this.getDropboxAccessToken()

        await axios.post(
            'https://api.dropboxapi.com/2/files/delete_v2',
            { path: document.storagePath },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        await this.documentRepo.delete({ id: documentId });
    }

    /**
     * Lista documenti dell'utente
     */
    async listDocuments(userId: UUID): Promise<DocumentEntity[]> {
        return this.documentRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' }
        })
    }
}
