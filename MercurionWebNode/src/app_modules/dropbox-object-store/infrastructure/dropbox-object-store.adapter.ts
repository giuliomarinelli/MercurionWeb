import { Injectable } from '@nestjs/common'
import { uuidv7 } from '@kripod/uuidv7'
import { OAuth2ClientService } from 'src/app_modules/oauth2-client/services/oauth2-client.service'
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'
import { ExternalHttpPort } from 'src/infrastructure/external-http/external-http.port'
import {
  ObjectReference,
  ObjectStore,
  PutObjectInput,
  PutObjectResult,
} from '../application/object-store.port'
import { StorageType } from '../models/enums/storage-type.enum'
import type { DropboxUploadResponse } from '../models/interfaces/dropbox-upload-response.interface'

const CONTENT_UPLOAD_URL = 'https://content.dropboxapi.com/2/files/upload'
const CONTENT_DOWNLOAD_URL = 'https://content.dropboxapi.com/2/files/download'
const API_DELETE_URL = 'https://api.dropboxapi.com/2/files/delete_v2'

@Injectable()
export class DropboxObjectStoreAdapter extends ObjectStore {
  constructor(
    private readonly oauth2ClientService: OAuth2ClientService,
    private readonly http: ExternalHttpPort,
  ) {
    super()
  }

  async put(input: PutObjectInput): Promise<PutObjectResult> {
    const path = `/mercurion/${uuidv7()}_${sanitizeFileName(input.name)}`
    const response = await this.request(
      CONTENT_UPLOAD_URL,
      input.body,
      {
        Authorization: await this.authorization(),
        'Dropbox-API-Arg': JSON.stringify({
          path,
          mode: 'add',
          autorename: true,
          mute: false,
          strict_conflict: false,
        }),
        'Content-Type': 'application/octet-stream',
      },
      'upload',
      'json',
    )
    const file = response as Partial<DropboxUploadResponse>
    const key = typeof file.id === 'string' && file.id
      ? file.id
      : typeof file.path_lower === 'string' && file.path_lower
        ? file.path_lower
        : null
    if (!key) throw applicationError(ApplicationErrorCode.DROPBOX_UPLOAD_RESPONSE_INVALID)
    return { reference: { key }, metadata: input.metadata }
  }

  async get(reference: ObjectReference): Promise<Buffer> {
    const response = await this.request(
      CONTENT_DOWNLOAD_URL,
      null,
      {
        Authorization: await this.authorization(),
        'Dropbox-API-Arg': JSON.stringify({ path: reference.key }),
        'Content-Type': 'application/octet-stream',
      },
      'download',
      'bytes',
    )
    if (!Buffer.isBuffer(response)) throw applicationError(ApplicationErrorCode.DROPBOX_DOWNLOAD_FAILED)
    return response
  }

  async delete(reference: ObjectReference): Promise<void> {
    await this.request(
      API_DELETE_URL,
      { path: reference.key },
      {
        Authorization: await this.authorization(),
        'Content-Type': 'application/json',
      },
      'delete',
      'json',
    )
  }

  private async authorization(): Promise<string> {
    const token = await this.oauth2ClientService.getAccessToken(StorageType.Dropbox)
    if (!token) throw applicationError(ApplicationErrorCode.DROPBOX_ACCESS_TOKEN_MISSING)
    return `Bearer ${token}`
  }

  private async request<TBody>(
    url: string,
    body: TBody,
    headers: Readonly<Record<string, string>>,
    operation: 'upload' | 'download' | 'delete',
    responseType: 'json' | 'bytes',
  ): Promise<unknown> {
    try {
      return (await this.http.request<unknown, TBody>({
        method: 'POST',
        url,
        body,
        headers,
        timeoutMs: 15_000,
        responseType,
      })).data
    } catch (cause) {
      const code = operation === 'upload'
        ? ApplicationErrorCode.DROPBOX_UPLOAD_FAILED
        : operation === 'download'
          ? ApplicationErrorCode.DROPBOX_DOWNLOAD_FAILED
          : ApplicationErrorCode.DROPBOX_DELETE_FAILED
      throw applicationError(code, undefined, undefined, cause)
    }
  }
}

function sanitizeFileName(name: string): string {
  const base = (name || 'upload.bin').split(/[/\\]/).pop()?.trim() || 'upload.bin'
  return base.replace(/[^\w.-]/g, '_').slice(0, 100)
}
