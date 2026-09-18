import { existsSync } from 'node:fs'
import {
  assertEmailTemplateContext,
  EMAIL_TEMPLATE_REGISTRY,
  EmailTemplateContextValidationError,
  EmailTemplateKey,
  getEmailTemplatePath,
} from './email-template-registry'

const fixtures = {
  'account-confirmation': { firstName: 'Ada', url: 'https://example.test/confirm' },
  'email-changed-new-contact': { firstName: 'Ada', newEmail: 'new@example.test' },
  'email-changed-old-contact': { firstName: 'Ada', newEmail: 'new@example.test' },
  'email-verification': { firstName: 'Ada', totp: '123456', period: 120 },
  'forgotten-password': { firstName: 'Ada', url: 'https://example.test/reset' },
  'password-changed': { firstName: 'Ada' },
  'mfa-login-code': { firstName: 'Ada', totp: '123456', period: 120, appName: 'Mercurion' },
  'mfa-disable-code': { firstName: 'Ada', totp: '123456', period: 120, appName: 'Mercurion' },
  'mfa-enable-code': { firstName: 'Ada', totp: '123456', period: 120, appName: 'Mercurion' },
  'help-ticket-opened-user': {
    ticketPublicId: 'T-123',
    ticketMessageBody: null,
    userFirstName: 'Ada',
    url: 'https://example.test/help',
  },
  'help-ticket-opened-support': {
    ticketPublicId: 'T-123',
    ticketMessageBody: 'A message',
    userFirstName: 'Ada',
    url: 'https://example.test/help',
  },
  'help-message-added': {
    ticketPublicId: 'T-123',
    ticketMessageBody: 'A message',
    userFirstName: 'Ada',
    url: 'https://example.test/help',
  },
  'help-support-replied': {
    ticketPublicId: 'T-123',
    ticketMessageBody: null,
    userFirstName: 'Ada',
    url: 'https://example.test/help',
  },
} satisfies Record<EmailTemplateKey, object>

describe('email template registry', () => {
  it('has one source/compiled-compatible asset and fixture for every production key', () => {
    for (const key of Object.keys(EMAIL_TEMPLATE_REGISTRY) as EmailTemplateKey[]) {
      assertEmailTemplateContext(key, fixtures[key])
      expect(existsSync(getEmailTemplatePath(key))).toBe(true)
      expect(EMAIL_TEMPLATE_REGISTRY[key].subject(fixtures[key] as never)).toEqual(expect.any(String))
    }
  })

  it('rejects invalid context before rendering or SMTP dispatch', () => {
    expect(() => assertEmailTemplateContext('email-verification', { firstName: 'Ada' }))
      .toThrow(EmailTemplateContextValidationError)
  })
})
