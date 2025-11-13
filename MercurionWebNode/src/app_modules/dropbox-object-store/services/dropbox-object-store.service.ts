import { Injectable, LoggerService } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DocumentEntity } from '../Models/entities/document.entity';
import { OAuth2ClientService } from 'src/app_modules/oauth2-client/services/oauth2-client.service';
import { StorageType } from '../Models/enums/storage-type.enum';
import { UUID } from 'crypto';
import { DropboxUploadResponse } from '../Models/interfaces/dropbox-upload-response.interface';
import { RpcException } from '@nestjs/microservices';
import { uuidv7 } from '@kripod/uuidv7';
import { StorageScope } from '../Models/enums/storage-scope.enum';
import { StorageAction } from '../Models/enums/storage-action.type';
import { User } from 'src/app_modules/user/Models/entities/user.entity';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';

@Injectable()
export class DropboxObjectStoreService {

    private readonly logger: LoggerService

    constructor(
        private readonly oauth2ClientService: OAuth2ClientService,
        @InjectRepository(DocumentEntity)
        private readonly documentRepo: Repository<DocumentEntity>,
        private readonly dataSource: DataSource,
        meiliLogger: MeiliLoggerService
    ) {
        this.logger = meiliLogger.forContext(DropboxObjectStoreService.name)
    }

    private sanitizeFileName(name: string): string {
        if (!name) return 'upload.bin';

        // prendi solo l'ultima componente dopo eventuali slash o backslash
        const base = name.split(/[/\\]/).pop() ?? 'upload.bin';

        const trimmed = base.trim() || 'upload.bin';

        // consenti solo lettere, numeri, punto, trattino, underscore
        const safe = trimmed.replace(/[^\w.-]/g, '_');

        // limite di lunghezza per non avere nomi kilometrici
        return safe.slice(0, 100);
    }


    /**
     * Prende il token globale dell'applicazione per Dropbox
     */
    private async getDropboxAccessToken(): Promise<string> {
        const token = await this.oauth2ClientService.getAccessToken(StorageType.Dropbox)
        if (!token) throw new RpcException('Unauthorized::Dropbox access token not available')
        return token
    }

    async getDocumentById(documentId: UUID): Promise<DocumentEntity | null> {
        return this.documentRepo.findOneBy({ id: documentId })
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
        isPublic = false,
        isActive = true,
        scope: StorageScope = StorageScope.None,
        action?: StorageAction
    ): Promise<DocumentEntity> {
        if (size !== buffer.length) {
            this.logger.warn(`Size mismatch: declared=${size}, actual=${buffer.length}`);
        }

        if (!mimeType) {
            mimeType = 'application/octet-stream';
        }

        if (note && note.length > 1000) {
            note = note.slice(0, 1000);
        }

        const accessToken = await this.getDropboxAccessToken();

        // Genera un path unico leggibile (non usato come chiave stabile)
        const safeOriginalName = this.sanitizeFileName(originalName);
        const dropboxPath = `/mercurion/${uuidv7()}_${safeOriginalName}`;

        // 1) Upload su Dropbox
        let uploadRes: AxiosResponse;
        try {
            uploadRes = await axios.post(
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
                    timeout: 15_000,
                }
            );
        } catch (err) {
            this.logger.error('Dropbox upload failed', err);
            throw new RpcException('UploadFailed::Dropbox error');
        }

        const file = uploadRes.data as DropboxUploadResponse;

        // Usa un identificatore stabile per le API successive (preferisci id, fallback a path_lower)
        const storagePath = file.id ?? file.path_lower;
        if (!storagePath) {
            // caso estremamente raro, ma meglio difensivo
            this.logger.error('Dropbox response missing id/path_lower', file);
            throw new RpcException('UploadFailed::Invalid Dropbox response');
        }

        // 2) Prepara il DocumentEntity
        const document = this.documentRepo.create({
            userId: ownerUserId,
            storageType: StorageType.Dropbox,
            storagePath,              // << id o path_lower
            originalName,
            size,
            mimeType,
            note: note ?? null,
            isPublic,
            scope,
            isActive,
            // createdAt è messo nel @BeforeInsert; aggiorna solo updatedAt qui
            updatedAt: Date.now(),
        });

        // Per cleanup post-commit dell’avatar precedente su Dropbox
        let oldAvatarPath: string | null = null;

        // 3) Transazione DB: salva documento, sposta avatar, elimina vecchio record
        try {
            await this.dataSource.manager.transaction(async (manager) => {
                await manager.save(DocumentEntity, document);

                if (action === 'ChangeProfileImage') {
                    const user = await manager.findOne(User, {
                        where: { id: ownerUserId },
                        relations: { avatar: true },
                    });
                    if (!user) throw new RpcException('NotFound::User');

                    const oldAvatar = user.avatar ?? null;

                    user.avatar = document;              // sposta la FK su nuovo documento
                    await manager.save(user);

                    if (oldAvatar) {
                        // elimina SOLO il record DB del vecchio avatar dentro la transazione
                        await manager.delete(DocumentEntity, { id: oldAvatar.id });
                        oldAvatarPath = oldAvatar.storagePath; // cleanup file su Dropbox dopo il commit
                    }
                }
            });
        } catch (err) {
            // Transazione fallita: rimuovi il file appena caricato su Dropbox (best effort)
            try {
                await axios.post(
                    'https://api.dropboxapi.com/2/files/delete_v2',
                    { path: storagePath },
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        timeout: 10_000,
                    }
                );
                this.logger.warn(`Rolled back Dropbox file due to DB error: ${storagePath ?? 'UNKNOWN PATH'}`);
            } catch (cleanupErr) {
                this.logger.error(`Failed to cleanup new Dropbox file after DB rollback: ${storagePath ?? 'UNKNOWN PATH'}`, cleanupErr);
            }
            throw err;
        }

        // 4) Post-commit: pulizia del vecchio file su Dropbox (se c'era)
        if (oldAvatarPath) {
            try {
                await axios.post(
                    'https://api.dropboxapi.com/2/files/delete_v2',
                    { path: oldAvatarPath },
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        timeout: 10_000,
                    }
                );
            } catch (cleanupErr) {
                // best effort: mantieni il DB coerente, logga per retry out-of-band
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                this.logger.error(`Failed to cleanup old avatar on Dropbox: ${oldAvatarPath}`, cleanupErr);
            }
        }

        return document;
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

        let res: AxiosResponse<any, any>

        try {
            res = await axios.post(
                'https://content.dropboxapi.com/2/files/download',
                null,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Dropbox-API-Arg': JSON.stringify({ path: document.storagePath }),
                        'Content-Type': 'application/octet-stream'
                    },
                    responseType: 'arraybuffer'
                }
            );
        } catch (err) {
            if (axios.isAxiosError(err) && err.response) {
                this.logger.error(
                    `Dropbox download error ${err.response.status}: ${JSON.stringify(err.response.data)}`,
                );
            }
            throw new RpcException('DownloadFailed::Dropbox error');
        }
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
