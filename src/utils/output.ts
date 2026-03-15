import chalk from 'chalk';
import Table from 'cli-table3';
import TurndownService from 'turndown';
import type { AccountConfig, EmailMessage, MailFolder } from '../types/index.js';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced'
});

/**
 * 格式化邮箱地址
 */
export function formatAddress(address: { name?: string; address: string }): string {
  if (address.name) {
    return `${address.name} <${address.address}>`;
  }
  return address.address;
}

/**
 * 格式化邮箱地址列表
 */
export function formatAddressList(addresses: Array<{ name?: string; address: string }>): string {
  if (addresses.length === 0) return '';
  return addresses.map(formatAddress).join(', ');
}

/**
 * 截断文本
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * 格式化日期
 */
export function formatDate(date: Date): string {
  const now = new Date();
  const emailDate = new Date(date);
  const diffMs = now.getTime() - emailDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // 今天，显示时间
    return emailDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return emailDate.toLocaleDateString([], { weekday: 'short' });
  } else {
    return emailDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

/**
 * 输出账户列表
 */
export function outputAccounts(accounts: AccountConfig[], defaultAccount: string | null): void {
  if (accounts.length === 0) {
    console.log(chalk.yellow('No accounts configured. Run `email config` to add an account.'));
    return;
  }

  const table = new Table({
    head: [chalk.cyan('Name'), chalk.cyan('Email'), chalk.cyan('Save Dir'), chalk.cyan('IMAP Host'), chalk.cyan('SMTP Host'), chalk.cyan('Default')],
    colWidths: [15, 28, 36, 24, 24, 10]
  });

  accounts.forEach(account => {
    const isDefault = account.name === defaultAccount || account.default;
      table.push([
        account.name,
        account.user,
        truncate(account.saveDir, 33),
        account.imap.host,
        account.smtp.host,
        isDefault ? chalk.green('Yes') : '-'
    ]);
  });

  console.log(table.toString());
}

/**
 * 输出账户详情
 */
export function outputAccountDetails(account: AccountConfig): void {
  const table = new Table({
    colWidths: [15, 60]
  });

  table.push(
    [chalk.cyan('Name'), account.name],
    [chalk.cyan('Email'), account.user],
    [chalk.cyan('Password'), chalk.gray(account.password ? '****' + account.password.slice(-4) : '(not set)')],
    [chalk.cyan('Save Dir'), account.saveDir],
    [chalk.cyan('IMAP Host'), account.imap.host],
    [chalk.cyan('IMAP Port'), account.imap.port.toString()],
    [chalk.cyan('IMAP TLS'), account.imap.tls ? chalk.green('Yes') : chalk.red('No')],
    [chalk.cyan('SMTP Host'), account.smtp.host],
    [chalk.cyan('SMTP Port'), account.smtp.port.toString()],
    [chalk.cyan('SMTP Secure'), account.smtp.secure ? chalk.green('Yes') : chalk.yellow('STARTTLS')],
    [chalk.cyan('Default'), (account.default ? chalk.green('Yes') : chalk.gray('No'))],
    [chalk.cyan('Created'), new Date(account.createdAt).toLocaleString()],
    [chalk.cyan('Updated'), new Date(account.updatedAt).toLocaleString()]
  );

  console.log(table.toString());
}

/**
 * 输出邮件列表
 */
export function outputEmails(emails: EmailMessage[], format: 'table' | 'json' | 'markdown' = 'table'): void {
  if (emails.length === 0) {
    console.log(chalk.yellow('No emails found.'));
    return;
  }

  if (format === 'json') {
    console.log(JSON.stringify(emails.map(toDisplayEmail), (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value, 2));
    return;
  }

  if (format === 'markdown') {
    emails.forEach((email, index) => {
      const displayEmail = toDisplayEmail(email);

      console.log(`\n--- Email ${index + 1} ---`);
      console.log(`From: ${formatAddress(displayEmail.from)}`);
      console.log(`To: ${formatAddressList(displayEmail.to)}`);
      if (displayEmail.cc?.length) console.log(`Cc: ${formatAddressList(displayEmail.cc)}`);
      console.log(`Subject: ${displayEmail.subject}`);
      console.log(`Date: ${displayEmail.date}`);
      console.log(`Flags: ${displayEmail.flags.join(', ') || '(none)'}`);
      if (displayEmail.text) console.log(`\nText:\n${displayEmail.text}`);
      if (displayEmail.markdown) console.log(`\nMarkdown:\n${displayEmail.markdown}`);
    });
    return;
  }

  // 表格格式
  const table = new Table({
    head: [chalk.cyan(' '), chalk.cyan('From'), chalk.cyan('Subject'), chalk.cyan('Date')],
    colWidths: [3, 25, 40, 10]
  });

  emails.forEach((email) => {
    const unread = !email.flags.includes('\\Seen') && !email.flags.includes('Seen');
    const icon = unread ? chalk.green('●') : ' ';
    const subject = truncate(email.subject || '(No subject)', 37);
    const fromName = email.from.name || email.from.address.split('@')[0];

    table.push([
      icon,
      truncate(fromName, 22),
      subject,
      formatDate(email.date)
    ]);
  });

  console.log(table.toString());
  console.log(chalk.gray(`\nTotal: ${emails.length} email(s)`));
}

function htmlToMarkdown(html: string): string {
  const markdown = turndownService.turndown(html).trim();
  return markdown || '(Empty markdown content)';
}

function toDisplayEmail(email: EmailMessage): EmailMessage & { markdown?: string } {
  const markdown = email.html ? htmlToMarkdown(email.html) : undefined;

  return {
    ...email,
    html: undefined,
    markdown
  };
}

/**
 * 输出文件夹列表
 */
export function outputFolders(folders: MailFolder[], format: 'table' | 'json' = 'table'): void {
  if (folders.length === 0) {
    console.log(chalk.yellow('No folders found.'));
    return;
  }

  if (format === 'json') {
    console.log(JSON.stringify(folders, null, 2));
    return;
  }

  const table = new Table({
    head: [chalk.cyan('Path'), chalk.cyan('Name')],
    colWidths: [50, 30]
  });

  folders.forEach(folder => {
    table.push([folder.path, folder.name]);
  });

  console.log(table.toString());
  console.log(chalk.gray(`\nTotal: ${folders.length} folder(s)`));
}

/**
 * 输出 JSON
 */
export function outputJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * 输出错误信息
 */
export function outputError(message: string, debug = false, error?: Error): void {
  console.error(chalk.red(`Error: ${message}`));

  if (debug && error) {
    console.error(chalk.gray(error.stack));
  }
}

/**
 * 输出成功信息
 */
export function outputSuccess(message: string): void {
  console.log(chalk.green(message));
}

/**
 * 输出警告信息
 */
export function outputWarning(message: string): void {
  console.log(chalk.yellow(message));
}
