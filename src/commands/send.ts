import { Command } from 'commander';
import * as readline from 'readline';
import type { SendOptions } from '../types/index.js';
import { getAccount } from '../services/config.js';
import { sendEmail } from '../services/smtp.js';
import { outputSuccess, outputError, outputWarning } from '../utils/output.js';

/**
 * 从 stdin 读取内容
 */
async function readFromStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    const rl = readline.createInterface({
      input: process.stdin,
      terminal: false
    });

    rl.on('line', (line) => {
      data += line + '\n';
    });

    rl.on('close', () => {
      resolve(data.trim());
    });
  });
}

/**
 * 解析逗号分隔的邮箱地址
 */
function parseEmails(input: string): string[] {
  return input.split(',').map(email => email.trim()).filter(Boolean);
}

/**
 * 发送命令
 */
export function createSendCommand(): Command {
  const send = new Command('send')
    .description('Send an email')
    .option('--from <email>', 'Sender email (overrides configured account)')
    .requiredOption('--to <emails>', 'Recipient emails (comma-separated)')
    .option('--cc <emails>', 'CC emails (comma-separated)')
    .option('--bcc <emails>', 'BCC emails (comma-separated)')
    .option('--subject <subject>', 'Email subject')
    .option('--body <text>', 'Plain text body')
    .option('--html <html>', 'HTML body')
    .option('--attach <files...>', 'Attachment file paths')
    .option('--stdin', 'Read body from stdin')
    .option('--dry-run', 'Preview email without sending')
    .option('--account <name>', 'Account name to use')
    .action(async (options, cmd) => {
      try {
        // 获取全局选项
        const globalOpts = cmd.optsWithGlobals();
        const accountName = options.account || globalOpts.account;
        
        // 获取账户配置
        const account = getAccount(accountName);
        if (!account) {
          outputError('No account configured. Run `email config` to add an account.');
          process.exit(1);
        }

        // 构建发送选项
        const sendOptions: SendOptions = {
          from: options.from || account.user,
          to: parseEmails(options.to),
          subject: options.subject || '',
          text: options.body || '',
          html: options.html,
          attachments: options.attach,
          dryRun: options.dryRun
        };

        if (options.cc) {
          sendOptions.cc = parseEmails(options.cc);
        }

        if (options.bcc) {
          sendOptions.bcc = parseEmails(options.bcc);
        }

        // 从 stdin 读取正文
        if (options.stdin) {
          const stdinBody = await readFromStdin();
          if (sendOptions.text) {
            sendOptions.text += '\n\n' + stdinBody;
          } else {
            sendOptions.text = stdinBody;
          }
        }

        // 验证必要参数
        if (!sendOptions.subject && !sendOptions.text && !sendOptions.html) {
          outputError('Subject or body is required');
          process.exit(1);
        }

        if (!options.dryRun) {
          outputWarning(`Sending email to ${sendOptions.to.join(', ')}...`);
        }

        // 发送邮件
        const result = await sendEmail(account, sendOptions);

        if (options.dryRun) {
          outputSuccess('Dry run completed. Email was not sent.');
        } else {
          outputSuccess(`Email sent! Message ID: ${result.messageId}`);
          if (result.rejected.length > 0) {
            outputWarning(`Rejected recipients: ${result.rejected.join(', ')}`);
          }
        }

      } catch (error) {
        outputError(`Failed to send email: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  return send;
}
