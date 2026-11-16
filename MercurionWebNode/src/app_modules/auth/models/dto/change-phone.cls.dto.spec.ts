import { ArgumentMetadata, ValidationPipe } from '@nestjs/common'
import { ChangePhoneDTO } from './change-phone.cls.dto'

describe('ChangePhoneDTO Italian destinations', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true })
  const metadata: ArgumentMetadata = { type: 'body', metatype: ChangePhoneDTO }

  it('accepts and trims an Italian prefix without changing the national number', async () => {
    await expect(
      pipe.transform({ internationalPrefix: ' +39 ', phoneNumber: ' 3123456789 ' }, metadata)
    ).resolves.toMatchObject({ internationalPrefix: '+39', phoneNumber: '3123456789' })
  })

  it.each(['+1', '+44', '+390', '39', '', null, 39])(
    'rejects an unsupported or malformed prefix: %s',
    async (internationalPrefix) => {
      await expect(
        pipe.transform({ internationalPrefix, phoneNumber: '3123456789' }, metadata)
      ).rejects.toMatchObject({ status: 400 })
    }
  )

  it.each(['+443123456789', '00393123456789x', '', '12345'])(
    'preserves national-number validation for %s',
    async (phoneNumber) => {
      await expect(
        pipe.transform({ internationalPrefix: '+39', phoneNumber }, metadata)
      ).rejects.toMatchObject({ status: 400 })
    }
  )
})
