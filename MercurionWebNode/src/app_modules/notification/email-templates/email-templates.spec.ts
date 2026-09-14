import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DeterministicHandlebarsAdapter } from './deterministic-handlebars.adapter';

const templateDirectory = join(__dirname);
const messageTemplates = [
  'confirmation.hbs',
  'email-changed-new-contact.hbs',
  'email-changed-old-contact.hbs',
  'email-verification.hbs',
  'forgotten-password.hbs',
  'password-changed-notification.hbs',
  'send-totp-for-2fa.hbs',
  'send-totp-to-disable-mfa.hbs',
  'send-totp-to-enable-mfa.hbs',
  'support---confirm-user-ticket-opened.hbs',
  'support---notify-support-new-message.hbs',
  'support---notify-support-new-ticket.hbs',
  'support---notify-user-support-replied.hbs',
] as const;

type Fixture = Record<string, string>;

const fixtures: Record<(typeof messageTemplates)[number], Fixture> = {
  'confirmation.hbs': { firstName: 'Ada', url: 'https://example.test/confirm?a=1&b=2' },
  'email-changed-new-contact.hbs': { firstName: 'Ada', newEmail: 'new@example.test' },
  'email-changed-old-contact.hbs': { firstName: 'Ada', newEmail: 'new@example.test' },
  'email-verification.hbs': { firstName: 'Ada', period: '120', totp: '123456' },
  'forgotten-password.hbs': { firstName: 'Ada', url: 'https://example.test/reset?token=a&b=2' },
  'password-changed-notification.hbs': { firstName: 'Ada' },
  'send-totp-for-2fa.hbs': { firstName: 'Ada', period: '120', totp: '123456' },
  'send-totp-to-disable-mfa.hbs': { firstName: 'Ada', period: '120', totp: '123456' },
  'send-totp-to-enable-mfa.hbs': { firstName: 'Ada', period: '120', totp: '123456' },
  'support---confirm-user-ticket-opened.hbs': {
    userFirstName: 'Ada',
    ticketPublicId: 'T-123',
    url: 'https://example.test/help?m=user&t_id=123',
  },
  'support---notify-support-new-message.hbs': {
    ticketPublicId: 'T-123',
    ticketMessageBody: '<script>alert("x")</script>',
    url: 'https://example.test/help?m=support&t_id=123',
  },
  'support---notify-support-new-ticket.hbs': {
    ticketPublicId: 'T-123',
    ticketMessageBody: '<b>New ticket</b>',
    url: 'https://example.test/help?m=support&t_id=123',
  },
  'support---notify-user-support-replied.hbs': {
    userFirstName: 'Ada',
    ticketPublicId: 'T-123',
    ticketMessageBody: '<b>Reply</b>',
    url: 'https://example.test/help?m=user&t_id=123',
  },
};

function render(template: string, context: Fixture): Promise<string> {
  const adapter = new DeterministicHandlebarsAdapter(templateDirectory);
  const mail: { data: { template: string; context: Fixture; html?: string } } = {
    data: { template, context },
  };
  return new Promise((resolve, reject) => {
    adapter.compile(
      mail,
      (error?: Error) => (error ? reject(error) : resolve(mail.data.html ?? '')),
      {
        template: {
          dir: templateDirectory,
          options: { strict: true },
        },
        options: {
          partials: { dir: templateDirectory },
        },
      },
    );
  });
}

describe('notification email templates', () => {
  it.each(messageTemplates)('renders %s through the canonical shell', async (template) => {
    const html = await render(template, fixtures[template]);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('class="email-wrapper"');
    expect(html).toContain('class="logo"');
    expect(html).toContain('class="footer"');
    expect(html).not.toContain('{{');
    expect(html).not.toContain('<script>alert');
  });

  it('preserves escaped URLs and message bodies', async () => {
    const html = await render('confirmation.hbs', fixtures['confirmation.hbs']);
    expect(html).toContain('https://example.test/confirm?a&#x3D;1&amp;b&#x3D;2');

    const supportHtml = await render(
      'support---notify-support-new-message.hbs',
      fixtures['support---notify-support-new-message.hbs'],
    );
    expect(supportHtml).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  });

  it('keeps strict rendering for missing required context', async () => {
    await expect(render('confirmation.hbs', { firstName: 'Ada' })).rejects.toThrow();
  });

  it('guards the 13 message templates against full-layout duplication', () => {
    const files = readdirSync(templateDirectory).filter((file) => file.endsWith('.hbs'));
    expect(files.sort()).toEqual([...messageTemplates].sort());

    for (const file of files) {
      const source = readFileSync(join(templateDirectory, file), 'utf8');
      expect(source).toMatch(/^\{\{#> layouts\/email-shell/);
      expect(source).not.toContain('<!DOCTYPE html>');
      expect(source).not.toContain('<style>');
      expect(source).not.toContain('<svg');
    }
  });
});
