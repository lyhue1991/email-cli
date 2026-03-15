#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { registerCommands } from './commands/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取 package.json 获取版本
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
);

/**
 * 创建 CLI 程序
 */
function createCLI(): Command {
  const program = new Command();

  program
    .name('email')
    .description('NPX 命令行邮件工具，支持 IMAP 收取和 SMTP 发送邮件')
    .version(packageJson.version)
    .option('--account <name>', 'Specify account name (uses first account by default)')
    .option('--json', 'Output in JSON format')
    .option('--quiet', 'Quiet mode, only output essential information')
    .option('--debug', 'Debug mode')
    .helpOption('-h, --help', 'Display help')
    .addHelpText('after', `
Examples:
  $ email config                       # Interactive configuration
  $ email config --show work           # Show account details with save path
  $ email config --list                # List all accounts
  $ email send --to user@example.com --subject "Hello" --body "Hi there!"
  $ email receive                      # List recent emails (no body, keeps unread status)
  $ email receive --unseen --max 20    # List up to 20 unread emails
  $ email receive --body               # Fetch email body (marks as read)
  $ email receive --format markdown         # Show body as Markdown
  $ email receive --attachments ./downloads         # Download attachments
  $ email folders                      # List mail folders
  $ email list                         # List configured accounts
  $ email --json receive --max 5       # Output recent emails as JSON

Common Provider Settings:
  Gmail:    imap.gmail.com:993, smtp.gmail.com:587
  Outlook:  outlook.office365.com:993, smtp.office365.com:587
  QQ:       imap.qq.com:993, smtp.qq.com:587
  163:      imap.163.com:993, smtp.163.com:465
  126:      imap.126.com:993, smtp.126.com:465
  139:      imap.139.com:993, smtp.139.com:465

Package:
  npm:      @lyhue1991/email-cli
  GitHub:   lyhue1991/email-cli
`);

  // 注册所有命令
  registerCommands(program);

  return program;
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const program = createCLI();

  try {
    await program.parseAsync();
  } catch (error) {
    const debug = process.argv.includes('--debug');

    if (debug && error instanceof Error) {
      console.error('Debug information:');
      console.error(error.stack);
    } else {
      console.error(`Error: ${(error as Error).message}`);
    }

    process.exit(1);
  }
}

// 运行 CLI
main();
