/**
 * 账户配置接口
 */
export interface AccountConfig {
  name: string;              // 账户名称
  user: string;              // 邮箱地址
  password: string;          // 加密存储
  imap: {
    host: string;
    port: number;            // 默认 993
    tls: boolean;            // 默认 true
  };
  smtp: {
    host: string;
    port: number;            // 默认 587
    secure: boolean;         // 默认 false (使用 STARTTLS)
  };
  default?: boolean;         // 是否为默认账户
  createdAt: string;         // ISO 时间戳
  updatedAt: string;
}

/**
 * 应用配置接口
 */
export interface AppConfig {
  version: string;
  defaultAccount: string;
  accounts: AccountConfig[];
  updatedAt?: string;
}

/**
 * 附件接口
 */
export interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  content?: Buffer;
}

/**
 * 邮件数据接口
 */
export interface EmailMessage {
  id: string;                // 邮件 UID
  from: { name?: string; address: string };
  to: Array<{ name?: string; address: string }>;
  cc?: Array<{ name?: string; address: string }>;
  subject: string;
  date: Date;
  text?: string;             // 纯文本正文
  html?: string;             // HTML 正文
  attachments: Attachment[];
  flags: string[];           // \Seen, \Answered, \Flagged, etc.
  folder: string;
}

/**
 * 邮件文件夹接口
 */
export interface MailFolder {
  path: string;
  name: string;
  delimiter?: string;
}

/**
 * 收取邮件选项
 */
export interface ReceiveOptions {
  folder?: string;
  unseen?: boolean;
  seen?: boolean;
  max?: number;
  from?: string;
  subject?: string;
  since?: string;
  format?: 'table' | 'json' | 'raw';
  saveDir?: string;
  attachmentsDir?: string;
  fetchBody?: boolean;        // 是否获取正文（会标记已读）
}

/**
 * 发送邮件选项
 */
export interface SendOptions {
  from?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: string[];
  dryRun?: boolean;
}

/**
 * 常见服务商预设
 */
export const PROVIDER_PRESETS: Record<string, { imap: { host: string; port: number; tls: boolean }; smtp: { host: string; port: number; secure: boolean } }> = {
  gmail: {
    imap: { host: 'imap.gmail.com', port: 993, tls: true },
    smtp: { host: 'smtp.gmail.com', port: 587, secure: false }
  },
  outlook: {
    imap: { host: 'outlook.office365.com', port: 993, tls: true },
    smtp: { host: 'smtp.office365.com', port: 587, secure: false }
  },
  qq: {
    imap: { host: 'imap.qq.com', port: 993, tls: true },
    smtp: { host: 'smtp.qq.com', port: 587, secure: false }
  },
  '163': {
    imap: { host: 'imap.163.com', port: 993, tls: true },
    smtp: { host: 'smtp.163.com', port: 465, secure: true }
  },
  '126': {
    imap: { host: 'imap.126.com', port: 993, tls: true },
    smtp: { host: 'smtp.126.com', port: 465, secure: true }
  },
  '139': {
    imap: { host: 'imap.139.com', port: 993, tls: true },
    smtp: { host: 'smtp.139.com', port: 465, secure: true }
  }
};
