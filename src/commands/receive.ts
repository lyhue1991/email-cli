import { Command } from 'commander';
import type { ReceiveOptions } from '../types/index.js';
import { getAccount } from '../services/config.js';
import { receiveEmails, listFolders } from '../services/imap.js';
import { outputEmails, outputFolders, outputError, outputSuccess, outputWarning } from '../utils/output.js';
import * as fs from 'fs';
import * as path from 'path';
import TurndownService from 'turndown';
import { resolveUserPath } from '../utils/paths.js';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced'
});

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
    .option('--format <format>', 'Output format: table, json, markdown', 'table')
    .option('--save <dir>', 'Save emails to directory')
    .option('--attachments <dir>', 'Download attachments to directory (implies body fetch)')
    .option('--account <name>', 'Account name to use')
    .option('--body', 'Fetch email body (will mark as read; implied by --format markdown)', false)
    .action(async (options, cmd) => {
      try {
        // 获取全局选项
        const globalOpts = cmd.optsWithGlobals();
        const accountName = options.account || globalOpts.account;
        const format = globalOpts.json ? 'json' : options.format;
        const saveDir = options.save ? path.resolve(options.save) : null;
        const attachmentsDir = options.attachments
          ? path.resolve(options.attachments)
          : (saveDir ? path.join(saveDir, 'attachments') : null);
        
        // 获取账户配置
        const account = getAccount(accountName);
        if (!account) {
          outputError('No account configured. Run `email config` to add an account.');
          process.exit(1);
        }

        const effectiveSaveDir = saveDir || resolveUserPath(account.saveDir);
        const effectiveAttachmentsDir = options.attachments
          ? attachmentsDir || undefined
          : path.join(effectiveSaveDir, 'attachments');
        const shouldFetchBody = options.body || format === 'markdown' || Boolean(options.attachments);

        // 构建收取选项
        const receiveOptions: ReceiveOptions = {
          folder: options.folder,
          unseen: options.unseen || false,
          seen: options.seen || false,
          max: options.max || 10,
          from: options.from,
          subject: options.subject,
          since: options.since,
          format: format as 'table' | 'json' | 'markdown',
          saveDir: effectiveSaveDir,
          attachmentsDir: effectiveAttachmentsDir,
          fetchBody: shouldFetchBody
        };

        // 获取全局 debug 选项
        const isDebug = globalOpts.debug === true;

        // 收取邮件
        const emails = await receiveEmails(account, receiveOptions, isDebug);

        // 输出结果
        outputEmails(emails, receiveOptions.format);

        // 下载附件
        const savedAttachmentPaths = new Map<string, string[]>();
        if (effectiveAttachmentsDir && emails.length > 0) {
          if (!fs.existsSync(effectiveAttachmentsDir)) {
            fs.mkdirSync(effectiveAttachmentsDir, { recursive: true });
          }

          let totalAttachments = 0;
          for (const email of emails) {
            if (email.attachments && email.attachments.length > 0) {
              const attachmentPaths: string[] = [];

              for (const att of email.attachments) {
                if (att.content) {
                  const filename = getUniqueAttachmentFilename(
                    effectiveAttachmentsDir,
                    att.filename || `attachment-${email.id}`,
                    email.id
                  );
                  const filePath = path.join(effectiveAttachmentsDir, filename);
                  fs.writeFileSync(filePath, att.content);
                  const displayPath = effectiveSaveDir
                    ? path.relative(effectiveSaveDir, filePath).split(path.sep).join('/')
                    : filePath;

                  attachmentPaths.push(displayPath);
                  totalAttachments++;
                  console.log(`  Saved: ${filename} (${att.size} bytes)`);
                }
              }

              if (attachmentPaths.length > 0) {
                savedAttachmentPaths.set(email.id, attachmentPaths);
              }
            }
          }

          if (totalAttachments > 0) {
            outputSuccess(`Downloaded ${totalAttachments} attachment(s) to ${effectiveAttachmentsDir}`);
          } else {
            outputWarning('No attachments found');
          }
        }

        // 保存正文
        if (effectiveSaveDir && emails.length > 0) {
          if (!fs.existsSync(effectiveSaveDir)) {
            fs.mkdirSync(effectiveSaveDir, { recursive: true });
          }

          let savedCount = 0;
          for (const email of emails) {
            const markdown = getEmailMarkdown(email.text, email.html);
            if (!markdown) {
              continue;
            }

            const filename = `${sanitizeFilename(email.date)}-${sanitizeFilename(email.subject || email.id)}-${email.id}.md`;
            const filePath = path.join(effectiveSaveDir, filename);
            const content = buildMarkdownFile(email, markdown, savedAttachmentPaths.get(email.id) || []);

            fs.writeFileSync(filePath, content, 'utf8');
            savedCount++;
            console.log(`  Saved email: ${filename}`);
          }

          if (savedCount > 0) {
            outputSuccess(`Saved ${savedCount} email body file(s) to ${effectiveSaveDir}`);
          } else {
            outputWarning('No email bodies found to save');
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

function getEmailMarkdown(text?: string, html?: string): string {
  if (html) {
    const markdown = turndownService.turndown(html).trim();
    if (markdown) {
      return markdown;
    }
  }

  return text?.trim() || '';
}

function sanitizeFilename(value: string | Date): string {
  const text = value instanceof Date ? value.toISOString().replace(/[.:]/g, '-') : value;
  const sanitized = text
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return sanitized || 'email';
}

function buildMarkdownFile(email: { from: { name?: string; address: string }; to: Array<{ name?: string; address: string }>; cc?: Array<{ name?: string; address: string }>; subject: string; date: Date; flags: string[]; attachments: Array<{ filename: string; size: number }> }, markdown: string, attachmentPaths: string[]): string {
  const lines = [
    `# ${email.subject || '(No subject)'}`,
    '',
    `- From: ${formatEmailAddress(email.from)}`,
    `- To: ${email.to.map(formatEmailAddress).join(', ') || '(none)'}`,
    `- Date: ${email.date.toISOString()}`,
    `- Flags: ${email.flags.join(', ') || '(none)'}`
  ];

  if (email.cc?.length) {
    lines.push(`- Cc: ${email.cc.map(formatEmailAddress).join(', ')}`);
  }

  lines.push('', '---', '', markdown, '');

  if (attachmentPaths.length > 0) {
    lines.push('## 附件', '');
    for (let i = 0; i < attachmentPaths.length; i++) {
      const attachment = email.attachments[i];
      const attachmentPath = attachmentPaths[i];
      const label = attachment?.filename || attachmentPath;

      lines.push(`- [${label}](${attachmentPath})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatEmailAddress(address: { name?: string; address: string }): string {
  return address.name ? `${address.name} <${address.address}>` : address.address;
}

function getUniqueAttachmentFilename(directory: string, filename: string, emailId: string): string {
  const parsed = path.parse(filename);
  const baseName = sanitizeFilename(parsed.name || `attachment-${emailId}`);
  const extension = parsed.ext || '';
  let candidate = `${baseName}${extension}`;
  let counter = 1;

  while (fs.existsSync(path.join(directory, candidate))) {
    candidate = `${baseName}-${emailId}-${counter}${extension}`;
    counter++;
  }

  return candidate;
}
