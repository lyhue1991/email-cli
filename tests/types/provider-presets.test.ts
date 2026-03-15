import { describe, expect, it } from 'vitest';
import { PROVIDER_PRESETS } from '../../src/types/index.js';

describe('PROVIDER_PRESETS', () => {
  it('includes dedicated presets for 126 and 139 mailboxes', () => {
    expect(PROVIDER_PRESETS['126']).toEqual({
      imap: { host: 'imap.126.com', port: 993, tls: true },
      smtp: { host: 'smtp.126.com', port: 465, secure: true }
    });

    expect(PROVIDER_PRESETS['139']).toEqual({
      imap: { host: 'imap.139.com', port: 993, tls: true },
      smtp: { host: 'smtp.139.com', port: 465, secure: true }
    });
  });
});
