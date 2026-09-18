import { join } from 'node:path'

export type EmailTemplateKey =
  | 'account-confirmation'
  | 'email-changed-new-contact'
  | 'email-changed-old-contact'
  | 'email-verification'
  | 'forgotten-password'
  | 'password-changed'
  | 'mfa-login-code'
  | 'mfa-disable-code'
  | 'mfa-enable-code'
  | 'help-ticket-opened-user'
  | 'help-ticket-opened-support'
  | 'help-message-added'
  | 'help-support-replied'

export interface AccountCtaEmailContext {
  firstName: string
  url: string
}

export interface EmailChangedContext {
  firstName: string
  newEmail: string
}

export interface EmailVerificationContext {
  firstName: string
  totp: string
  period: number
}

export interface PasswordChangedContext {
  firstName: string
}

export interface MfaCodeContext {
  firstName: string
  totp: string
  period: number
  appName: string
}

export interface HelpEmailContext {
  ticketPublicId: string
  ticketMessageBody: string | null
  userFirstName: string
  url: string
}

export type EmailTemplateContextMap = {
  'account-confirmation': AccountCtaEmailContext
  'email-changed-new-contact': EmailChangedContext
  'email-changed-old-contact': EmailChangedContext
  'email-verification': EmailVerificationContext
  'forgotten-password': AccountCtaEmailContext
  'password-changed': PasswordChangedContext
  'mfa-login-code': MfaCodeContext
  'mfa-disable-code': MfaCodeContext
  'mfa-enable-code': MfaCodeContext
  'help-ticket-opened-user': HelpEmailContext
  'help-ticket-opened-support': HelpEmailContext
  'help-message-added': HelpEmailContext
  'help-support-replied': HelpEmailContext
}

type ContextValidator<T> = (value: unknown) => value is T
type SubjectBuilder<T> = (context: T) => string

export interface EmailTemplateDefinition<K extends EmailTemplateKey> {
  readonly asset: string
  readonly subject: SubjectBuilder<EmailTemplateContextMap[K]>
  readonly isValidContext: ContextValidator<EmailTemplateContextMap[K]>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasStrings = (value: unknown, keys: readonly string[]): value is Record<string, string> =>
  isRecord(value) && keys.every(key => typeof value[key] === 'string')

const isAccountCta = (value: unknown): value is AccountCtaEmailContext =>
  hasStrings(value, ['firstName', 'url'])

const isEmailChanged = (value: unknown): value is EmailChangedContext =>
  hasStrings(value, ['firstName', 'newEmail'])

const isVerification = (value: unknown): value is EmailVerificationContext =>
  hasStrings(value, ['firstName', 'totp']) &&
  isRecord(value) &&
  typeof value.period === 'number' &&
  Number.isFinite(value.period)

const isCode = (value: unknown): value is MfaCodeContext =>
  hasStrings(value, ['firstName', 'totp', 'appName']) &&
  isRecord(value) &&
  typeof value.period === 'number' &&
  Number.isFinite(value.period)

const isHelp = (value: unknown): value is HelpEmailContext =>
  hasStrings(value, ['ticketPublicId', 'userFirstName', 'url']) &&
  isRecord(value) &&
  (typeof value.ticketMessageBody === 'string' || value.ticketMessageBody === null)

const isPasswordChanged = (value: unknown): value is PasswordChangedContext =>
  hasStrings(value, ['firstName'])

export const EMAIL_TEMPLATE_REGISTRY = {
  'account-confirmation': {
    asset: 'confirmation.hbs',
    subject: context => `${context.firstName}, completa la tua registrazione a Mercurion`,
    isValidContext: isAccountCta,
  },
  'email-changed-new-contact': {
    asset: 'email-changed-new-contact.hbs',
    subject: () => 'Mercurion: email modificata',
    isValidContext: isEmailChanged,
  },
  'email-changed-old-contact': {
    asset: 'email-changed-old-contact.hbs',
    subject: () => 'Mercurion: email modificata',
    isValidContext: isEmailChanged,
  },
  'email-verification': {
    asset: 'email-verification.hbs',
    subject: () => 'Conferma il tuo nuovo indirizzo email',
    isValidContext: isVerification,
  },
  'forgotten-password': {
    asset: 'forgotten-password.hbs',
    subject: () => 'Mercurion: recupero password',
    isValidContext: isAccountCta,
  },
  'password-changed': {
    asset: 'password-changed-notification.hbs',
    subject: () => 'Mercurion: password modificata',
    isValidContext: isPasswordChanged,
  },
  'mfa-login-code': {
    asset: 'send-totp-for-2fa.hbs',
    subject: context => `Il tuo codice per accedere a ${context.appName}`,
    isValidContext: isCode,
  },
  'mfa-disable-code': {
    asset: 'send-totp-to-disable-mfa.hbs',
    subject: context => `Codice per disattivare l'MFA via email in ${context.appName}`,
    isValidContext: isCode,
  },
  'mfa-enable-code': {
    asset: 'send-totp-to-enable-mfa.hbs',
    subject: context => `Il tuo codice per attivare l'MFA in ${context.appName}`,
    isValidContext: isCode,
  },
  'help-ticket-opened-user': {
    asset: 'support---confirm-user-ticket-opened.hbs',
    subject: () => 'Supporto Mercurion: un nuovo ticket è stato aperto',
    isValidContext: isHelp,
  },
  'help-ticket-opened-support': {
    asset: 'support---notify-support-new-ticket.hbs',
    subject: () => 'Un nuovo ticket è stato aperto',
    isValidContext: isHelp,
  },
  'help-message-added': {
    asset: 'support---notify-support-new-message.hbs',
    subject: context => `Un nuovo ticket messaggio è stato pubblicato nel ticket #${context.ticketPublicId}`,
    isValidContext: isHelp,
  },
  'help-support-replied': {
    asset: 'support---notify-user-support-replied.hbs',
    subject: context => `Supporto Mercurion: Il ticket #${context.ticketPublicId} ha ricevuto una nuova risposta`,
    isValidContext: isHelp,
  },
} satisfies { [K in EmailTemplateKey]: EmailTemplateDefinition<K> }

export class EmailTemplateContextValidationError extends Error {
  constructor(
    public readonly templateKey: EmailTemplateKey,
    public readonly context: unknown,
  ) {
    super(`Invalid context for email template "${templateKey}"`)
    this.name = 'EmailTemplateContextValidationError'
  }
}

export function getEmailTemplateDefinition<K extends EmailTemplateKey>(
  key: K,
): EmailTemplateDefinition<K> {
  return EMAIL_TEMPLATE_REGISTRY[key] as unknown as EmailTemplateDefinition<K>
}

export function getEmailTemplatePath(key: EmailTemplateKey): string {
  return join(__dirname, 'email-templates', getEmailTemplateDefinition(key).asset)
}

export function assertEmailTemplateContext<K extends EmailTemplateKey>(
  key: K,
  context: unknown,
): asserts context is EmailTemplateContextMap[K] {
  if (!getEmailTemplateDefinition(key).isValidContext(context)) {
    throw new EmailTemplateContextValidationError(key, context)
  }
}
