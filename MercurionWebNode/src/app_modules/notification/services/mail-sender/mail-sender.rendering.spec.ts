import { MailerModule } from '@nestjs-modules/mailer'
import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { join } from 'node:path'
import { UserService } from '../../../user/services/user.service'
import { LoggerPort } from '../../../../logging/logger.port'
import { DeterministicHandlebarsAdapter } from '../../email-templates/deterministic-handlebars.adapter'
import { MailSenderService } from './mail-sender.service'

describe('transactional mail rendering without SMTP', () => {
  let module: TestingModule
  let sender: MailSenderService

  beforeAll(async () => {
    const templateRoot = join(__dirname, '../../email-templates')
    module = await Test.createTestingModule({
      imports: [MailerModule.forRoot({
        transport: { jsonTransport: true },
        defaults: { from: 'Mercurion <no-reply@example.test>' },
        template: {
          dir: templateRoot,
          adapter: new DeterministicHandlebarsAdapter(templateRoot),
          options: { strict: true },
        },
        options: { partials: { dir: templateRoot } },
      })],
      providers: [
        MailSenderService,
        { provide: ConfigService, useValue: { get: () => 'support@example.test' } },
        { provide: UserService, useValue: {} },
        { provide: LoggerPort, useValue: { forContext: () => ({}) } },
      ],
    }).compile()
    sender = module.get(MailSenderService)
  })

  afterAll(async () => module?.close())

  it('preserves sender, recipient, subject, notification ID and the fragment CTA through the real mailer', async () => {
    const url = 'https://example.test/account/activate#t=qa.abc.def'
    const notificationId = '00000000-0000-4000-8000-000000000123'
    const result = await sender.send('account-confirmation', 'ada@example.test', {
      firstName: 'Ada & Maria', url,
    }, notificationId) as { message: string }
    const message = JSON.parse(result.message) as {
      from: { address: string; name: string }
      to: { address: string }[]
      subject: string
      headers: Record<string, string>
      html: string
    }

    expect(message.from).toEqual({ address: 'no-reply@example.test', name: 'Mercurion' })
    expect(message.to).toEqual([{ address: 'ada@example.test', name: '' }])
    expect(message.subject).toBe('Ada & Maria, completa la tua registrazione a Mercurion')
    expect(message.headers['X-Mercurion-Notification-Id']).toBe(notificationId)
    expect(message.html).toContain(`href="${url}"`)
    expect(message.html).toContain('Ciao Ada &amp; Maria!')
    expect(message.html).toMatch(/<a\b[^>]*style="[^"]*background-color:/)
  })

  it('keeps an OTP starting with zero and renders the supplied period', async () => {
    const result = await sender.send('mfa-login-code', 'ada@example.test', {
      firstName: 'Ada', totp: '012345', period: 90, appName: 'Mercurion',
    }) as { message: string }
    const message = JSON.parse(result.message) as { subject: string; html: string }

    expect(message.subject).toBe('Il tuo codice per accedere a Mercurion')
    expect(message.html).toMatch(/class="otp-code"[^>]*>012345<\/p>/)
    expect(message.html).toContain('ogni 90 secondi')
  })
})
