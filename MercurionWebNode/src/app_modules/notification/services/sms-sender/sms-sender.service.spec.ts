import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { ApplicationErrorCode } from 'src/exception-handling/application-error'
import { presentApplicationError } from 'src/exception-handling/application-error-envelope'
import { SmsSenderService } from './sms-sender.service'

const mockCreate = jest.fn()
jest.mock('twilio', () => ({
  Twilio: jest.fn().mockImplementation(() => ({ messages: { create: mockCreate } })),
}))

describe('SmsSenderService Italian destinations', () => {
  let service: SmsSenderService

  beforeEach(async () => {
    mockCreate.mockReset()
    const module = await Test.createTestingModule({
      providers: [
        SmsSenderService,
        {
          provide: ConfigService,
          useValue: new ConfigService({
            Sms: {
              accountSID: 'synthetic-account',
              authToken: 'synthetic-token',
              from: 'Mercurion',
            },
          }),
        },
      ],
    }).compile()
    service = module.get(SmsSenderService)
  })

  it('can be constructed by the Nest dependency injector', () => {
    expect(service).toBeDefined()
  })

  it('preserves the configured alphanumeric sender and the Twilio result', async () => {
    const accepted = { sid: 'synthetic-message', status: 'queued' }
    mockCreate.mockResolvedValue(accepted)
    await expect(service.sendSms('+393123456789', 'Synthetic message')).resolves.toBe(accepted)
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockCreate).toHaveBeenCalledWith({
      to: '+393123456789',
      body: 'Synthetic message',
      from: 'Mercurion',
    })
  })

  it.each(['+13123456789', '+443123456789', '00393123456789', '393123456789', '+39', '+39abc'])(
    'blocks %s before contacting Twilio, including stored foreign numbers',
    async (to) => {
      await expect(service.sendSms(to, 'Synthetic message')).rejects.toMatchObject({
        code: ApplicationErrorCode.UNPROCESSABLE_ENTITY,
        httpStatus: 422,
      })
      expect(mockCreate).not.toHaveBeenCalled()
    }
  )

  it('keeps the destination restriction understandable in production without exposing the number', async () => {
    const error = await service
      .sendSms('+443123456789', 'Synthetic message')
      .catch((cause: unknown) => cause)
    const presented = presentApplicationError(error, {
      isProduction: true,
      correlationId: 'synthetic',
    })
    expect(presented.status).toBe(422)
    expect(presented.message).toBe('Sono supportati solo numeri italiani con prefisso +39.')
    expect(JSON.stringify(presented)).not.toContain('+443123456789')
  })

  it('propagates a provider failure without retrying or reporting success', async () => {
    const error = new Error('Synthetic provider outage')
    mockCreate.mockRejectedValue(error)
    await expect(service.sendSms('+393123456789', 'Synthetic message')).rejects.toBe(error)
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })
})
