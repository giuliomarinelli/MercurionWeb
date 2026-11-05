// Synthetic data only. These fixtures never configure a mail transport.
const account = { firstName: 'Ada & Maria' }
const token = `qa.${'a'.repeat(180)}.${'b'.repeat(180)}`
const ticket = {
  ticketPublicId: 'MTCK-000000123',
  userFirstName: 'Ada & Maria',
  ticketMessageBody: 'Buongiorno,\nvorrei informazioni sulla ricerca molecolare.\nGrazie per l’assistenza.',
  url: 'https://example.test/help?m=user&t_id=00000000-0000-4000-8000-000000000123',
}
const code = { ...account, totp: '012345', period: 120, appName: 'Mercurion' }

export const emailPreviewFixtures = {
  'account-confirmation': { ...account, url: `https://example.test/account/activate#t=${token}` },
  'email-changed-new-contact': { ...account, newEmail: `${'nuovo.indirizzo.'.repeat(5)}qa@example.test` },
  'email-changed-old-contact': { ...account, newEmail: `${'nuovo.indirizzo.'.repeat(5)}qa@example.test` },
  'email-verification': { ...account, totp: code.totp, period: code.period },
  'forgotten-password': { ...account, url: `https://example.test/password-recovery#t=${token}` },
  'password-changed': account,
  'mfa-login-code': code,
  'mfa-disable-code': code,
  'mfa-enable-code': code,
  'help-ticket-opened-user': { ...ticket, ticketMessageBody: null },
  'help-ticket-opened-support': { ...ticket, url: ticket.url.replace('m=user', 'm=support') },
  'help-message-added': { ...ticket, url: ticket.url.replace('m=user', 'm=support') },
  'help-support-replied': { ...ticket, ticketMessageBody: null },
}
