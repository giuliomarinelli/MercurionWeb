import { BadRequestException } from '@nestjs/common'
import { parseDocumentUpload } from './document-upload.adapter'
import { DOCUMENT_UPLOAD_MAX_FILE_SIZE } from './document-upload.policy'

function requestWith(
  fields: Record<string, unknown>,
  file: Record<string, unknown> | Record<string, unknown>[] | undefined
) {
  const files = file === undefined ? null : { file }
  return {
    files,
    parseMultipart: jest.fn().mockResolvedValue(fields)
  } as never
}

describe('parseDocumentUpload', () => {
  it('returns typed metadata and a bounded temporary-file descriptor', async () => {
    const request = requestWith(
      { note: 'chemistry', isPublic: 'true', scope: 'None' },
      {
        filepath: 'C:\\upload.tmp',
        originalFilename: 'sample.pdf',
        mimetype: 'application/pdf',
        size: 12
      }
    )

    const command = await parseDocumentUpload(request)

    expect(command.metadata).toMatchObject({
      note: 'chemistry',
      isPublic: true,
      scope: 'None'
    })
    expect(command.file).toMatchObject({
      originalName: 'sample.pdf',
      mimeType: 'application/pdf',
      size: 12
    })
    expect(typeof command.file.open).toBe('function')
  })

  it.each([
    ['missing file', undefined],
    ['multiple files', [{ filepath: 'a' }, { filepath: 'b' }]],
    ['unsupported MIME', { filepath: 'a', mimetype: 'text/plain', size: 1 }],
    ['oversized file', {
      filepath: 'a',
      mimetype: 'application/pdf',
      size: DOCUMENT_UPLOAD_MAX_FILE_SIZE + 1
    }]
  ])('rejects %s at the transport boundary', async (_name, file) => {
    await expect(parseDocumentUpload(requestWith({}, file))).rejects.toBeInstanceOf(
      BadRequestException
    )
  })

  it('rejects malformed metadata before application logic', async () => {
    await expect(
      parseDocumentUpload(requestWith({ isPublic: 'sometimes' }, {
        filepath: 'a',
        mimetype: 'application/pdf',
        size: 1
      }))
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})
