import { Transform } from 'class-transformer'
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator'
import { StorageScope } from '../models/enums/storage-scope.enum'
import {
  DOCUMENT_UPLOAD_ACTIONS,
  DOCUMENT_UPLOAD_MAX_NOTE_LENGTH,
  type DocumentUploadAction
} from './document-upload.policy'

function firstValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value
}

function optionalText(value: unknown): unknown {
  const first = firstValue(value)
  return first === '' || first === undefined ? undefined : first
}

export class DocumentUploadMetadataDto {
  @IsOptional()
  @IsString()
  @MaxLength(DOCUMENT_UPLOAD_MAX_NOTE_LENGTH)
  @Transform(({ value }) => optionalText(value))
  note?: string

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    const first = firstValue(value)
    if (first === undefined || first === '') return undefined
    if (first === 'true' || first === true) return true
    if (first === 'false' || first === false) return false
    return first
  })
  isPublic = false

  @IsOptional()
  @IsEnum(StorageScope)
  @Transform(({ value }) => firstValue(value) || StorageScope.None)
  scope: StorageScope = StorageScope.None

  @IsOptional()
  @IsIn(DOCUMENT_UPLOAD_ACTIONS)
  @Transform(({ value }) => optionalText(value))
  action?: DocumentUploadAction
}
