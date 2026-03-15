import { Command } from 'commander';
import inquirer from 'inquirer';
import type { AccountConfig } from '../types/index.js';
import {
  getAllAccounts,
  getAccount,
  saveAccount,
  removeAccount,
  setDefaultAccount,
  getDefaultAccountName
} from '../services/config.js';
import {
  outputAccounts,
  outputAccountDetails,
  outputJson,
  outputSuccess,
  outputError,
  outputWarning
} from '../utils/output.js';
import { PROVIDER_PRESETS } from '../types/index.js';
import { getDefaultSaveDir, resolveUserPath } from '../utils/paths.js';

/**
 * 识别邮箱服务商
 */
function detectProvider(email: string): string | null {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;

  if (domain.includes('gmail')) return 'gmail';
  if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live')) return 'outlook';
  if (domain.includes('qq')) return 'qq';
  if (domain.includes('163')) return '163';
  if (domain.includes('126')) return '126';
  if (domain.includes('139')) return '139';

  return null;
}

/**
 * 获取服务商预设
 */
function getProviderPreset(email: string) {
  const provider = detectProvider(email);
  if (!provider) {
    return null;
  }

  return PROVIDER_PRESETS[provider] || null;
}

/**
 * 交互式配置账户
 */
async function interactiveConfig(): Promise<AccountConfig> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Account name:',
      default: 'default',
      validate: (input: string) => input.length > 0 || 'Account name is required'
    },
    {
      type: 'input',
      name: 'user',
      message: 'Email address:',
      validate: (input: string) => {
        if (!input.includes('@')) return 'Please enter a valid email address';
        return true;
      }
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password / App password:',
      validate: (input: string) => input.length > 0 || 'Password is required'
    },
    {
      type: 'input',
      name: 'saveDir',
      message: 'Default save directory:',
      default: (answers: { name: string }) => getDefaultSaveDir(answers.name || 'default'),
      filter: (input: string) => resolveUserPath(input)
    },
    {
      type: 'input',
      name: 'imapHost',
      message: 'IMAP server:',
      default: (answers: { user: string }) => {
        const preset = getProviderPreset(answers.user);
        if (preset) {
          return preset.imap.host;
        }
        return '';
      },
      validate: (input: string) => input.length > 0 || 'IMAP host is required'
    },
    {
      type: 'number',
      name: 'imapPort',
      message: 'IMAP port:',
      default: (answers: { user: string }) => getProviderPreset(answers.user)?.imap.port || 993
    },
    {
      type: 'confirm',
      name: 'imapTls',
      message: 'Use TLS for IMAP:',
      default: (answers: { user: string }) => getProviderPreset(answers.user)?.imap.tls ?? true
    },
    {
      type: 'input',
      name: 'smtpHost',
      message: 'SMTP server:',
      default: (answers: { user: string }) => {
        const preset = getProviderPreset(answers.user);
        if (preset) {
          return preset.smtp.host;
        }
        return '';
      },
      validate: (input: string) => input.length > 0 || 'SMTP host is required'
    },
    {
      type: 'number',
      name: 'smtpPort',
      message: 'SMTP port:',
      default: (answers: { user: string }) => getProviderPreset(answers.user)?.smtp.port || 587
    },
    {
      type: 'confirm',
      name: 'smtpSecure',
      message: 'Use SSL/TLS for SMTP (No for STARTTLS):',
      default: (answers: { user: string }) => getProviderPreset(answers.user)?.smtp.secure ?? false
    }
  ]);

  const account: AccountConfig = {
    name: answers.name,
    user: answers.user,
    password: answers.password,
    saveDir: answers.saveDir,
    imap: {
      host: answers.imapHost,
      port: answers.imapPort,
      tls: answers.imapTls
    },
    smtp: {
      host: answers.smtpHost,
      port: answers.smtpPort,
      secure: answers.smtpSecure
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return account;
}

/**
 * 配置命令
 */
export function createConfigCommand(): Command {
  const config = new Command('config')
    .description('Configure email accounts')
    .option('--name <name>', 'Account name')
    .option('--user <email>', 'Email address')
    .option('--password <password>', 'Password / App password')
    .option('--save-dir <dir>', 'Default email save directory')
    .option('--imap-host <host>', 'IMAP server')
    .option('--imap-port <port>', 'IMAP port', parseInt)
    .option('--no-imap-tls', 'Disable TLS for IMAP')
    .option('--smtp-host <host>', 'SMTP server')
    .option('--smtp-port <port>', 'SMTP port', parseInt)
    .option('--smtp-secure', 'Use SSL/TLS for SMTP')
    .option('--list', 'List all configured accounts')
    .option('--show <name>', 'Show account details')
    .option('--remove <name>', 'Remove an account')
    .option('--default <name>', 'Set default account')
    .action(async (options, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();

        // 列出账户
        if (options.list) {
          const accounts = getAllAccounts();
          const defaultAccount = getDefaultAccountName();
          if (globalOpts.json) {
            outputJson({ accounts, defaultAccount });
            return;
          }
          outputAccounts(accounts, defaultAccount);
          return;
        }

        // 显示账户详情
        if (options.show) {
          const account = getAccount(options.show);
          if (!account) {
            outputError(`Account '${options.show}' not found`);
            return;
          }
          if (globalOpts.json) {
            outputJson(account);
            return;
          }
          outputAccountDetails(account);
          return;
        }

        // 删除账户
        if (options.remove) {
          const removed = removeAccount(options.remove);
          if (removed) {
            outputSuccess(`Account '${options.remove}' removed`);
          } else {
            outputError(`Account '${options.remove}' not found`);
          }
          return;
        }

        // 设置默认账户
        if (options.default) {
          const success = setDefaultAccount(options.default);
          if (success) {
            outputSuccess(`Default account set to '${options.default}'`);
          } else {
            outputError(`Account '${options.default}' not found`);
          }
          return;
        }

        // 命令行配置或交互式配置
        let account: AccountConfig;

        if (options.name && options.user && options.password && options.imapHost && options.smtpHost) {
          const preset = getProviderPreset(options.user);

          // 命令行配置
          account = {
            name: options.name,
            user: options.user,
            password: options.password,
            saveDir: options.saveDir ? resolveUserPath(options.saveDir) : getDefaultSaveDir(options.name),
            imap: {
              host: options.imapHost,
              port: options.imapPort || preset?.imap.port || 993,
              tls: options.imapTls !== false
            },
            smtp: {
              host: options.smtpHost,
              port: options.smtpPort || preset?.smtp.port || 587,
              secure: options.smtpSecure || preset?.smtp.secure || false
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // 检查是否覆盖现有账户
          const existing = getAccount(options.name);
          if (existing) {
            outputWarning(`Account '${options.name}' already exists. It will be updated.`);
          }
        } else {
          // 交互式配置
          account = await interactiveConfig();
        }

        saveAccount(account);
        outputSuccess(`Account '${account.name}' saved successfully`);

      } catch (error) {
        outputError(`Config command failed: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  return config;
}
