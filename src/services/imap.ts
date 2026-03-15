import { ImapFlow } from 'imapflow';
import type { ImapFlowOptions } from 'imapflow';
import type { AccountConfig, EmailMessage, Attachment, MailFolder, ReceiveOptions } from '../types/index.js';

/**
 * 创建 IMAP 客户端
 */
export function createImapClient(account: AccountConfig, debug = false): ImapFlow {
  const options: ImapFlowOptions = {
    host: account.imap.host,
    port: account.imap.port,
    secure: account.imap.tls,
    auth: {
      user: account.user,
      pass: account.password
    },
    tls: {
      rejectUnauthorized: false
    },
    logger: debug ? {
      debug: (msg) => console.error('[DEBUG]', msg),
      error: (msg) => console.error('[ERROR]', msg),
      info: (msg) => console.error('[INFO]', msg),
      warn: (msg) => console.error('[WARN]', msg)
    } : false
  };

  return new ImapFlow(options);
}

/**
 * 解析邮件地址
 */
function parseAddress(address?: string | { address?: string; name?: string } | Array<{ address?: string; name?: string }>): { name?: string; address: string } | null {
  if (!address) return null;

  if (typeof address === 'string') {
    return { address };
  }

  if (Array.isArray(address)) {
    if (address.length === 0) return null;
    const addr = address[0];
    return {
      name: addr.name,
      address: addr.address || ''
    };
  }

  return {
    name: address.name,
    address: address.address || ''
  };
}

/**
 * 解析邮件地址列表
 */
function parseAddressList(addressList?: Array<{ address?: string; name?: string }>): Array<{ name?: string; address: string }> {
  if (!addressList || addressList.length === 0) return [];
  return addressList.map(addr => ({
    name: addr.name,
    address: addr.address || ''
  }));
}

/**
 * 收取邮件
 */
export async function receiveEmails(
  account: AccountConfig,
  options: ReceiveOptions = {},
  debug = false
): Promise<EmailMessage[]> {
  const {
    folder = 'INBOX',
    unseen = false,
    seen = false,
    max = 10,
    from,
    subject,
    since,
    fetchBody = false
  } = options;

  const client = createImapClient(account, debug);

  try {
    await client.connect();

    // 选择文件夹
    const lock = await client.getMailboxLock(folder);

    try {
      // 构建搜索条件
      const searchConditions: Record<string, unknown> = {};

      if (unseen) {
        searchConditions.seen = false;
      } else if (seen) {
        searchConditions.seen = true;
      }

      if (from) {
        searchConditions.from = from;
      }

      if (subject) {
        searchConditions.subject = subject;
      }

      if (since) {
        searchConditions.since = new Date(since);
      }

      // 搜索邮件
      const messages: EmailMessage[] = [];

      // 先搜索获取所有匹配的序列号
      const hasConditions = Object.keys(searchConditions).length > 0;
      let seqList: number[] = [];
      
      if (hasConditions) {
        const result = await client.search(searchConditions);
        seqList = result === false ? [] : (Array.isArray(result) ? result : []);
      } else {
        // 获取所有邮件序列号
        const result = await client.search({});
        seqList = result === false ? [] : (Array.isArray(result) ? result : []);
      }

      // 按日期倒序排列（最新的在前）- 获取邮件信封信息
      if (seqList.length > 0) {
        // 将序列号数组倒序（通常较大的序列号是较新的邮件）
        seqList = seqList.reverse();
        
        // 限制获取数量
        const fetchSeqs = seqList.slice(0, max);
        
        // 先只获取信封信息（不标记已读）
        for (const seq of fetchSeqs) {
          const fetchIterator = client.fetch(seq, {
            envelope: true,
            flags: true,
            bodyStructure: true,
            source: false
          });

          for await (const msg of fetchIterator) {
            const email: EmailMessage = {
              id: msg.uid?.toString() || seq.toString(),
              from: parseAddress(msg.envelope?.from) || { address: '' },
              to: parseAddressList(msg.envelope?.to),
              cc: parseAddressList(msg.envelope?.cc),
              subject: msg.envelope?.subject || '',
              date: msg.envelope?.date || new Date(),
              text: '',
              html: '',
              attachments: [],
              flags: msg.flags ? Array.from(msg.flags) : [],
              folder
            };

            messages.push(email);
          }
        }

        // 如果需要获取正文，再获取并标记已读
        if (fetchBody && messages.length > 0) {
          for (let i = 0; i < messages.length; i++) {
            const seq = fetchSeqs[i];
            const email = messages[i];
            
            const fetchIterator = client.fetch(seq, {
              source: true
            });

            for await (const msg of fetchIterator) {
              if (msg.source) {
                const simpleParser = await import('mailparser');
                const parsed = await simpleParser.simpleParser(msg.source);

                email.text = parsed.text || '';
                email.html = parsed.html || '';

                if (parsed.attachments && parsed.attachments.length > 0) {
                  email.attachments = parsed.attachments.map((att: { filename?: string; contentType?: string; size?: number; content?: Buffer }) => ({
                    filename: att.filename || 'unknown',
                    contentType: att.contentType || 'application/octet-stream',
                    size: att.size || 0,
                    content: att.content
                  }));
                }
              }
            }
          }

          // 批量标记所有邮件为已读
          await client.messageFlagsAdd(fetchSeqs, ['\\Seen']);
          // 更新本地 flags
          for (const email of messages) {
            if (!email.flags.includes('\\Seen')) {
              email.flags.push('\\Seen');
            }
          }
        }
      }

      return messages;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

/**
 * 获取邮件正文
 */
export async function getEmailBody(
  account: AccountConfig,
  folder: string,
  seq: number
): Promise<{ text?: string; html?: string; attachments: Attachment[] }> {
  const client = createImapClient(account);

  try {
    await client.connect();

    const lock = await client.getMailboxLock(folder);

    try {
      const result = {
        text: '',
        html: '',
        attachments: [] as Attachment[]
      };

      // 获取邮件完整内容
      const fetchIterator = client.fetch(seq, {
        source: true
      });

      for await (const msg of fetchIterator) {
        const source = msg.source;
        if (source) {
          const simpleParser = await import('mailparser');
          const parsed = await simpleParser.simpleParser(source);
          
          result.text = parsed.text || '';
          result.html = parsed.html || '';
          
          if (parsed.attachments && parsed.attachments.length > 0) {
            result.attachments = parsed.attachments.map((att: { filename?: string; contentType?: string; size?: number; content?: Buffer }) => ({
              filename: att.filename || 'unknown',
              contentType: att.contentType || 'application/octet-stream',
              size: att.size || 0,
              content: att.content
            }));
          }
        }
      }

      return result;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

/**
 * 列出文件夹
 */
export async function listFolders(account: AccountConfig): Promise<MailFolder[]> {
  const client = createImapClient(account);

  try {
    await client.connect();

    const folders: MailFolder[] = [];

    const listResult = await client.list();
    for (const mailbox of listResult) {
      folders.push({
        path: mailbox.path,
        name: mailbox.name,
        delimiter: mailbox.delimiter
      });
    }

    return folders;
  } finally {
    await client.logout();
  }
}

/**
 * 下载附件 - 简化版本
 */
export async function downloadAttachments(
  _account: AccountConfig,
  _folder: string,
  _uid: string,
  _saveDir: string
): Promise<Attachment[]> {
  // 简化实现，返回空数组
  return [];
}