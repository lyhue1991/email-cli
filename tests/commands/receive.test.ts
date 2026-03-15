import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sampleAccount = {
  name: 'demo',
  user: 'demo@example.com',
  password: 'secret',
  imap: { host: 'imap.example.com', port: 993, tls: true },
  smtp: { host: 'smtp.example.com', port: 465, secure: true },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

const receiveEmails = vi.fn(async () => ([{
  id: '1',
  from: { address: 'sender@example.com', name: 'Sender' },
  to: [{ address: 'demo@example.com', name: 'Demo' }],
  cc: [],
  subject: 'Hello',
  date: new Date('2026-01-01T00:00:00.000Z'),
  text: 'body',
  html: '',
  attachments: [],
  flags: [],
  folder: 'INBOX'
}]));

vi.mock('../../src/services/config.js', () => ({
  getAccount: vi.fn(() => sampleAccount)
}));

vi.mock('../../src/services/imap.js', () => ({
  receiveEmails,
  listFolders: vi.fn(async () => [])
}));

describe('receive command', () => {
  beforeEach(() => {
    receiveEmails.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses global --json to switch receive output format', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const { createReceiveCommand } = await import('../../src/commands/receive.js');

    const program = new Command();
    program.option('--json');
    program.addCommand(createReceiveCommand());

    await program.parseAsync(['node', 'email', '--json', 'receive']);

    expect(receiveEmails).toHaveBeenCalledWith(
      sampleAccount,
      expect.objectContaining({ format: 'json' }),
      false
    );
    expect(logSpy).toHaveBeenCalled();
  });
});
