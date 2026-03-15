import { Command } from 'commander';
import type { ReceiveOptions } from '../types/index.js';
import { getAccount } from '../services/config.js';
import { receiveEmails, listFolders } from '../services/imap.js';
import { outputEmails, outputFolders, outputError, outputSuccess, outputWarning } from '../utils/output.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 收取命令
 */
export function createReceiveCommand(): Command {
  const receive = new Command('receive')
    .description('Receive emails')
    .alias('recv')
    .option('--folder <name>', 'Mailbox folder', 'INBOX')
    .option('--unseen', 'Only unread emails')
    .option('--seen', 'Only read emails')
    .option('--max <count>', 'Maximum number of emails', parseInt)
    .option('--from <email>', 'Filter by sender')
    .option('--subject <pattern>', 'Filter by subject pattern')
    .option('--since <date>', 'Filter by date (YYYY-MM-DD)')
    .option('--format <format>', 'Output format: table, json, raw', 'table')
    .option('--save <dir>', 'Save emails to directory')
    .option('--attachments <dir>', 'Download attachments to directory')
    .option('--account <name>', 'Account name to use')
    .option('--body', 'Fetch email body (will mark as read)', false)
    .action(async (options, cmd) => {
      try {
        // 获取全局选项
        const globalOpts = cmd.optsWithGlobals();
        const accountName = options.account || globalOpts.account;
        const format = globalOpts.json ? 'json' : options.format;
        
        // 获取账户配置
        const account = getAccount(accountName);
        if (!account) {
          outputError('No account configured. Run `email config` to add an account.');
          process.exit(1);
        }

        // 构建收取选项
        const receiveOptions: ReceiveOptions = {
          folder: options.folder,
          unseen: options.unseen || false,
          seen: options.seen || false,
          max: options.max || 10,
          from: options.from,
          subject: options.subject,
          since: options.since,
          format: format as 'table' | 'json' | 'raw',
          saveDir: options.save,
          attachmentsDir: options.attachments,
          fetchBody: options.body || false
        };

        // 获取全局 debug 选项
        const isDebug = globalOpts.debug === true;

        // 收取邮件
        const emails = await receiveEmails(account, receiveOptions, isDebug);

        // 输出结果
        outputEmails(emails, receiveOptions.format);

        // 下载附件
        if (options.attachments && emails.length > 0) {
          const attachmentsDir = path.resolve(options.attachments);
          if (!fs.existsSync(attachmentsDir)) {
            fs.mkdirSync(attachmentsDir, { recursive: true });
          }

          let totalAttachments = 0;
          for (const email of emails) {
            if (email.attachments && email.attachments.length > 0) {
              for (const att of email.attachments) {
                if (att.content) {
                  const filename = att.filename || `attachment-${email.id}`;
                  const filePath = path.join(attachmentsDir, filename);
                  fs.writeFileSync(filePath, att.content);
                  totalAttachments++;
                  console.log(`  Saved: ${filename} (${att.size} bytes)`);
                }
              }
            }
          }

          if (totalAttachments > 0) {
            outputSuccess(`Downloaded ${totalAttachments} attachment(s) to ${attachmentsDir}`);
          } else {
            outputWarning('No attachments found');
          }
        }

      } catch (error) {
        outputError(`Failed to receive emails: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  return receive;
}

/**
 * 文件夹命令
 */
export function createFoldersCommand(): Command {
  const folders = new Command('folders')
    .description('List mail folders')
    .alias('list-folders')
    .option('--format <format>', 'Output format: table, json', 'table')
    .option('--account <name>', 'Account name to use')
    .action(async (options, cmd) => {
      try {
        // 获取全局选项
        const globalOpts = cmd.optsWithGlobals();
        const accountName = options.account || globalOpts.account;
        const format = globalOpts.json ? 'json' : options.format;
        
        // 获取账户配置
        const account = getAccount(accountName);
        if (!account) {
          outputError('No account configured. Run `email config` to add an account.');
          process.exit(1);
        }

        // 列出文件夹
        const folderList = await listFolders(account);

        // 输出结果
        outputFolders(folderList, format as 'table' | 'json');

      } catch (error) {
        outputError(`Failed to list folders: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  return folders;
}
