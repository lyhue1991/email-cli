import nodemailer from 'nodemailer';
import type { AccountConfig, SendOptions, Attachment } from '../types/index.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 创建 SMTP 传输器
 */
export function createSmtpTransport(account: AccountConfig): nodemailer.Transporter {
  const transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.password
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  return transporter;
}

/**
 * 处理附件
 */
async function processAttachments(attachmentPaths?: string[]): Promise<Attachment[]> {
  if (!attachmentPaths || attachmentPaths.length === 0) {
    return [];
  }

  const attachments: Attachment[] = [];

  for (const filePath of attachmentPaths) {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      console.warn(`Warning: Attachment not found: ${absolutePath}`);
      continue;
    }

    const filename = path.basename(filePath);
    const content = fs.readFileSync(absolutePath);

    attachments.push({
      filename,
      contentType: getMimeType(filename),
      size: content.length,
      content
    });
  }

  return attachments;
}

/**
 * 获取文件 MIME 类型
 */
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.rtf': 'application/rtf',
    '.csv': 'text/csv',
    '.xml': 'application/xml',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    '.7z': 'application/x-7z-compressed'
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 发送邮件
 */
export async function sendEmail(
  account: AccountConfig,
  options: SendOptions
): Promise<{ messageId: string; accepted: string[]; rejected: string[] }> {
  const {
    from,
    to,
    cc,
    bcc,
    subject,
    text,
    html,
    attachments: attachmentPaths,
    dryRun = false
  } = options;

  // 处理附件
  const attachments = await processAttachments(attachmentPaths);

  // 构建邮件
  const mailOptions: nodemailer.SendMailOptions = {
    from: from || account.user,
    to: to.join(', '),
    subject,
    text,
    html,
    attachments: attachments.map(a => ({
      filename: a.filename,
      content: a.content
    }))
  };

  if (cc && cc.length > 0) {
    mailOptions.cc = cc.join(', ');
  }

  if (bcc && bcc.length > 0) {
    mailOptions.bcc = bcc.join(', ');
  }

  if (dryRun) {
    // 预览模式
    console.log('\n=== Email Preview ===');
    console.log(`From: ${mailOptions.from}`);
    console.log(`To: ${mailOptions.to}`);
    if (mailOptions.cc) console.log(`Cc: ${mailOptions.cc}`);
    if (mailOptions.bcc) console.log(`Bcc: ${mailOptions.bcc}`);
    console.log(`Subject: ${mailOptions.subject}`);
    console.log(`\nBody:\n${text || html || '(No body)'}`);
    if (attachments.length > 0) {
      console.log(`\nAttachments (${attachments.length}):`);
      attachments.forEach(a => console.log(`  - ${a.filename} (${a.size} bytes)`));
    }
    console.log('======================\n');

    return {
      messageId: '(dry-run)',
      accepted: to,
      rejected: []
    };
  }

  // 创建传输器并发送
  const transporter = createSmtpTransport(account);

  try {
    const info = await transporter.sendMail(mailOptions);

    return {
      messageId: info.messageId,
      accepted: info.accepted || to,
      rejected: info.rejected || []
    };
  } catch (error) {
    throw new Error(`Failed to send email: ${(error as Error).message}`);
  }
}

/**
 * 验证 SMTP 连接
 */
export async function verifySmtpConnection(account: AccountConfig): Promise<boolean> {
  const transporter = createSmtpTransport(account);

  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error(`SMTP connection failed: ${(error as Error).message}`);
    return false;
  }
}
