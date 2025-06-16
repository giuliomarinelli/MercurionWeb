import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity } from '../Models/entities/document.entity';
import { OAuth2ClientService } from 'src/app_modules/oauth2-client/services/oauth2-client.service';
import { StorageType } from '../Models/enums/storage-type.enum';
import { UUID } from 'crypto';
import { DropboxUploadResponse } from '../Models/interfaces/dropbox-upload-response.interface';
import { RpcException } from '@nestjs/microservices';
import { uuidv7 } from '@kripod/uuidv7';

@Injectable()
export class DropboxObjectStoreService {

    private readonly logger = new Logger(DropboxObjectStoreService.name)

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
        if (!token) throw new RpcException('Unauthorized::Dropbox access token not available')
        return token
    }

    /**
     * Upload file: carica su Dropbox, poi crea record DocumentEntity
     */
    async uploadFile(
        buffer: Buffer,
        originalName: string,
        mimeType: string,
        size: number,
        ownerUserId: UUID,
        note?: string,
        isPublic = false
    ): Promise<DocumentEntity> {

        const accessToken = await this.getDropboxAccessToken()

        // Genera path unico
        const dropboxPath = `/mercurion/${uuidv7()}_${originalName}`
        let dropboxFile: DropboxUploadResponse;

        try {
            // 1. Upload su Dropbox
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
            dropboxFile = res.data as DropboxUploadResponse;

            // 2. Crea record su DB
            const document = this.documentRepo.create({
                userId: ownerUserId,
                storageType: StorageType.Dropbox,
                storagePath: dropboxFile.path_display,
                originalName,
                size,
                mimeType,
                note: note ?? null,
                isPublic,
                updatedAt: Date.now(),
            });

            await this.documentRepo.save(document);
            return document;

        } catch (err) {
            // 3. Se fallisce il save, elimina il file da Dropbox (best effort)
            this.logger.error('Upload DB failed, attempt Dropbox cleanup...');
            try {
                await axios.post(
                    'https://api.dropboxapi.com/2/files/delete_v2',
                    { path: dropboxPath },
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );
                this.logger.log(`Cleaned up orphan file: ${dropboxPath}`)
            } catch (dropboxErr) {
                this.logger.error(
                    `Failed to cleanup orphan Dropbox file ${dropboxPath}: ${dropboxErr?.message || dropboxErr}`
                );
            }
            throw err
        }
    }


    /**
     * Download file: trova il record, verifica permessi, scarica da Dropbox
     */
    async downloadFile(documentId: UUID, requestingUserId: UUID): Promise<Buffer> {

        const document = await this.documentRepo.findOne({ where: { id: documentId } })
        if (!document) throw new RpcException('NotFound::Dropbox document not found')
        if (!document.isPublic && document.userId !== requestingUserId)
            throw new RpcException('Unauthorized::Missing permissions to access this file')

        const accessToken = await this.getDropboxAccessToken()

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
        return Buffer.from(res.data)
    }

    /**
     * Elimina file (Dropbox + DB)
     */
    async deleteFile(documentId: UUID, requestingUserId: UUID): Promise<void> {
        const document = await this.documentRepo.findOneBy({ id: documentId })
        if (!document) throw new RpcException('NotFound::Dropbox document not found')
        if (!document.isPublic && document.userId !== requestingUserId)
            throw new RpcException('Unauthorized::Missing permissions to access this file')

        const accessToken = await this.getDropboxAccessToken()

        // 1. Elimina da Dropbox
        try {
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
        } catch (err) {
            this.logger.error(`Failed to delete Dropbox file: ${document.storagePath}`, err)
            throw new RpcException('DeleteFailed::Could not remove file from Dropbox')
        }

        // 2. Elimina da DB (rollback non possibile, log su failure)
        try {
            await this.documentRepo.delete({ id: documentId });
        } catch (err) {
            this.logger.error(`File deleted from Dropbox but not from DB! DocumentId: ${documentId}`, err)
            throw new RpcException('DeleteFailed::File removed from Dropbox but not from DB')
        }
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
