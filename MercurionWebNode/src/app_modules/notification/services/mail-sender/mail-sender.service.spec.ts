import { Test, TestingModule } from '@nestjs/testing'
import { MailSenderService } from './mail-sender.service'
import { MailerService } from '@nestjs-modules/mailer'
import { ConfigService } from '@nestjs/config'
import { UserService } from 'src/app_modules/user/services/user.service'
import { LoggerPort } from 'src/logging/logger.port'
import { Ticket } from '../../../help/models/entities/ticket.entity'
import { TicketMessage } from '../../../help/models/entities/ticket-message.entity'
import { formatHelpPublicId } from '../../../help/models/value-objects/help-public-id'

describe('MailSenderService', () => {
  let service: MailSenderService
  let sendMail: jest.Mock
  let config: ConfigService
  let users: UserService

  beforeEach(async () => {
    sendMail = jest.fn()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailSenderService,
        { provide: MailerService, useValue: { sendMail } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('support@example.com') } },
        {
          provide: UserService,
          useValue: {
            getUserFirstNameById: jest.fn(),
            getUserEmailById: jest.fn(),
          },
        },
        {
          provide: LoggerPort,
          useValue: {
            forContext: jest.fn().mockReturnValue({ warn: jest.fn() }),
          },
        },
      ],
    }).compile()

    service = module.get<MailSenderService>(MailSenderService)
    config = module.get(ConfigService)
    users = module.get(UserService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('validates registry context before invoking the mail adapter', async () => {
    await expect(service.send('email-verification', 'ada@example.test', {
      firstName: 'Ada',
      totp: '123456',
    } as any)).rejects.toThrow('Invalid context for email template')
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('derives subject and template from the semantic key', async () => {
    await service.send('password-changed', 'ada@example.test', { firstName: 'Ada' })
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      subject: 'Mercurion: password modificata',
      template: expect.stringContaining('password-changed-notification.hbs'),
    }))
  })

  it.each(['user', 'support'] as const)('keeps the %s ticket destination with a trailing slash in the origin', async mode => {
    jest.spyOn(config, 'get').mockReturnValue('https://example.test/')
    jest.spyOn(users, 'getUserFirstNameById').mockResolvedValue('Ada')
    jest.spyOn(users, 'getUserEmailById').mockResolvedValue('ada@example.test')
    const ticket = Object.assign(new Ticket(), {
      id: '00000000-0000-4000-8000-000000000123',
      userId: '00000000-0000-4000-8000-000000000456',
    })
    const message = Object.assign(new TicketMessage(), {
      authorId: ticket.userId,
      contentHtml: '<p>Non usare HTML grezzo</p>',
      contentDelta: { ops: [{ insert: 'Prima riga\n' }, { insert: 'Seconda riga', attributes: { bold: true } }] },
    })

    if (mode === 'user') {
      await service.confirmUserTicketOpened(ticket, message, formatHelpPublicId('123', 'Ticket'))
    } else {
      await service.notifySupportNewMessage(ticket, message, formatHelpPublicId('123', 'Ticket'))
    }

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({
        url: `https://example.test/help?m=${mode}&t_id=${ticket.id}`,
        ticketPublicId: 'MTCK-000000123',
        ticketMessageBody: 'Prima riga\nSeconda riga',
      }),
    }))
  })

  it.each([
    { delta: '{invalid', text: null },
    { delta: { ops: [{ insert: { image: 'https://example.test/image' } }] }, text: null },
    { delta: JSON.stringify({ ops: [{ insert: '<script>alert(1)</script>\n' }] }), text: '<script>alert(1)</script>' },
  ])('handles legacy deltas and embeds without including contentHtml', async ({ delta, text }) => {
    jest.spyOn(users, 'getUserFirstNameById').mockResolvedValue('Ada')
    const ticket = Object.assign(new Ticket(), { id: '00000000-0000-4000-8000-000000000123' })
    const message = Object.assign(new TicketMessage(), {
      authorId: '00000000-0000-4000-8000-000000000456',
      contentDelta: delta,
      contentHtml: '<img src="https://example.test/tracking">',
    })
    jest.spyOn(config, 'get').mockReturnValue('https://example.test')

    await service.notifySupportNewTicket(ticket, message, formatHelpPublicId('123', 'Ticket'))

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({ ticketMessageBody: text }),
    }))
  })
})
