import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountConfig } from '../../src/types/index.js';

function createAccount(name: string, user: string): AccountConfig {
  return {
    name,
    user,
    password: 'secret',
    imap: { host: `${name}.imap.test`, port: 993, tls: true },
    smtp: { host: `${name}.smtp.test`, port: 465, secure: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

describe('config service', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'email-cli-test-'));
    process.env.XDG_CONFIG_HOME = tempDir;
    vi.resetModules();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    delete process.env.XDG_CONFIG_HOME;
    vi.restoreAllMocks();
  });

  it('uses the first saved account as default fallback', async () => {
    const configService = await import('../../src/services/config.js');

    configService.saveAccount(createAccount('first', 'first@example.com'));

    expect(configService.getDefaultAccountName()).toBe('first');
    expect(configService.getAccount()?.name).toBe('first');
  });

  it('promotes the next account when removing the default account', async () => {
    const configService = await import('../../src/services/config.js');

    configService.saveAccount(createAccount('first', 'first@example.com'));
    configService.saveAccount(createAccount('second', 'second@example.com'));

    expect(configService.removeAccount('first')).toBe(true);
    expect(configService.getDefaultAccountName()).toBe('second');
    expect(configService.getAccount()?.name).toBe('second');
  });

  it('loads mismatched config versions without noisy warnings', async () => {
    const cryptoUtils = await import('../../src/utils/crypto.js');
    fs.mkdirSync(path.dirname(cryptoUtils.CONFIG_FILE), { recursive: true });
    fs.writeFileSync(cryptoUtils.CONFIG_FILE, JSON.stringify({
      version: '1.0.0',
      defaultAccount: 'legacy',
      accounts: [createAccount('legacy', 'legacy@example.com')]
    }, null, 2));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const configService = await import('../../src/services/config.js');
    const config = configService.loadConfig();

    expect(config.version).toBe('1.0.0');
    expect(config.defaultAccount).toBe('legacy');
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
