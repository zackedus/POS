import assert from 'node:assert/strict';
import test from 'node:test';
import { MailService } from './mail.service';

test('MailService: logs to console in dev mode', async () => {
  const config = {
    get: (key: string) => {
      if (key === 'NODE_ENV') return 'development';
      if (key === 'SMTP_HOST') return undefined;
      return undefined;
    },
  };
  const mail = new MailService(config as never);
  const result = await mail.send({
    to: 'owner@toko.test',
    subject: 'Test Weekly Report',
    text: 'Hello',
    attachments: [{ filename: 'report.csv', content: 'a,b,c' }],
  });
  assert.equal(result.sent, true);
  assert.equal(result.mode, 'console');
});
