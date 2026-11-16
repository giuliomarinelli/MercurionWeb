export const DOCUMENT_UPLOAD_MAX_FILE_SIZE = 10 * 1024 * 1024
export const DOCUMENT_UPLOAD_MAX_NOTE_LENGTH = 1000
export const DOCUMENT_UPLOAD_FILE_FIELD = 'file'

export const DOCUMENT_UPLOAD_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/csv',
  'chemical/x-mdl-sdfile',
  'image/png',
  'image/jpeg'
] as const

export const DOCUMENT_UPLOAD_ACTIONS = ['ChangeProfileImage'] as const

export type DocumentUploadMimeType =
  typeof DOCUMENT_UPLOAD_ALLOWED_MIME_TYPES[number]

export type DocumentUploadAction = typeof DOCUMENT_UPLOAD_ACTIONS[number]
