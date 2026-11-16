import { DropboxObjectStoreAdapter } from './dropbox-object-store.adapter'

describe('DropboxObjectStoreAdapter', () => {
  it('maps provider upload responses to a neutral object reference', async () => {
    const http = { request: jest.fn().mockResolvedValue({ data: { id: 'id:1', path_lower: '/file' } }) }
    const oauth = { getAccessToken: jest.fn().mockResolvedValue('token') }
    const adapter = new DropboxObjectStoreAdapter(oauth as never, http as never)

    await expect(adapter.put({
      body: Buffer.from('data'),
      name: '../unsafe file.txt',
      metadata: { contentType: 'text/plain', size: 4, originalName: '../unsafe file.txt' },
    })).resolves.toEqual({
      reference: { key: 'id:1' },
      metadata: { contentType: 'text/plain', size: 4, originalName: '../unsafe file.txt' },
    })
    expect(http.request).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      url: 'https://content.dropboxapi.com/2/files/upload',
      headers: expect.objectContaining({ Authorization: 'Bearer token' }),
    }))
  })

  it('rejects provider responses without an object identifier', async () => {
    const adapter = new DropboxObjectStoreAdapter(
      { getAccessToken: jest.fn().mockResolvedValue('token') } as never,
      { request: jest.fn().mockResolvedValue({ data: {} }) } as never,
    )
    await expect(adapter.put({
      body: Buffer.from('data'),
      name: 'file.txt',
      metadata: { contentType: 'text/plain', size: 4, originalName: 'file.txt' },
    })).rejects.toMatchObject({ code: 'DROPBOX_UPLOAD_RESPONSE_INVALID' })
  })
})
