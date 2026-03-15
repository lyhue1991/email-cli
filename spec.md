# email-cli 规格文档

> NPX 命令行邮件工具，支持 IMAP 收取和 SMTP 发送邮件

## 1. 项目概述

### 1.1 目标

提供一个简洁的命令行工具，让用户可以：

- 配置多个邮件账户（IMAP + SMTP）
- 收取邮件（支持筛选未读、限制数量）
- 发送邮件（支持附件）
- 列出邮件文件夹

### 1.2 技术栈

- **语言**: TypeScript 5.3+
- **运行时**: Node.js >= 18 (ESM)
- **CLI 框架**: Commander.js
- **IMAP 客户端**: imapflow
- **SMTP 客户端**: nodemailer
- **邮件解析**: mailparser
- **交互式输入**: inquirer
- **输出格式化**: chalk + cli-table3

### 1.3 安装方式

```bash
# NPX 直接运行
npx @lyhue1991/email-cli send --to user@example.com --subject "Hello"

# 或全局安装
npm install -g @lyhue1991/email-cli
email send --to user@example.com --subject "Hello"
```

GitHub 仓库：`lyhue1991/email-cli`

---

## 2. 命令设计

### 2.1 全局选项

```bash
email [command] [options]

Options:
  --account <name>    指定账户名（默认优先使用 defaultAccount，否则使用第一个账户）
  --json              JSON 格式输出
  --quiet             静默模式，只输出必要信息
  --debug             调试模式
  -h, --help          显示帮助
  -V, --version       显示版本
```

### 2.2 config - 配置账户

```bash
email config [options]

Options:
  --name <name>              账户名称（默认: default）
  --user <email>             邮箱地址
  --password <password>       密码/应用专用密码
  --save-dir <dir>           默认邮件保存目录
  --imap-host <host>         IMAP 服务器地址
  --imap-port <port>         IMAP 端口（默认: 993）
  --no-imap-tls              禁用 IMAP TLS（默认启用）
  --smtp-host <host>         SMTP 服务器地址
  --smtp-port <port>         SMTP 端口（默认: 587）
  --smtp-secure              使用 SSL/TLS for SMTP
  --list                     列出所有已配置账户
  --show <name>              显示指定账户配置
  --remove <name>            删除指定账户
  --default <name>           设置默认账户

Examples:
  # 交互式配置
  email config

  # 命令行配置
  email config --name work \
    --user me@company.com \
    --password "app-password" \
    --save-dir "~/Library/Application Support/email-cli/emails/work" \
    --imap-host imap.company.com \
    --smtp-host smtp.company.com

  # 列出账户
  email config --list

  # 删除账户
  email config --remove work
```

说明：
- 每个账户保存一个默认 `saveDir`
- 收取邮件时未显式传入 `--save`，则自动使用账户配置中的 `saveDir`
- 默认路径按平台生成，并附带账户名目录，便于多账户隔离

### 2.3 send - 发送邮件

```bash
email send [options]

Options:
  --from <email>             发件人（默认使用配置账户邮箱）
  --to <email>               收件人（支持多个，逗号分隔）
  --cc <email>               抄送（支持多个）
  --bcc <email>              密送（支持多个）
  --subject <subject>        邮件主题
  --body <text>              纯文本正文
  --html <html>              HTML 正文
  --attach <file>            附件路径（支持多个: --attach a.pdf --attach b.png）
  --stdin                    从 stdin 读取正文
  --dry-run                  预览邮件，不实际发送

Examples:
  # 简单发送
  email send --to recipient@example.com --subject "Hello" --body "Hi there!"

  # 管道方式
  echo "This is the body" | email send --to recipient@example.com --subject "Hello" --stdin

  # 带附件
  email send --to recipient@example.com \
    --subject "Report" \
    --body "Please find attached." \
    --attach ./report.pdf \
    --attach ./data.xlsx

  # HTML 邮件
  email send --to recipient@example.com \
    --subject "Newsletter" \
    --html "<h1>Hello</h1><p>Content here</p>"
```

### 2.4 receive - 收取邮件

```bash
email receive [options]

Options:
  --folder <name>            文件夹名称（默认: INBOX）
  --unseen                   只收取未读邮件
  --seen                     只收取已读邮件
  --max <count>              最大数量（默认: 10）
  --from <email>             按发件人筛选
  --subject <pattern>        按主题筛选（支持模糊匹配）
  --since <date>             收取指定日期之后的邮件（YYYY-MM-DD）
  --format <format>          输出格式: table, json, markdown（默认: table）
  --body                     获取邮件正文（会标记为已读；使用 --format markdown 时自动启用）
  --attachments <dir>        下载附件到指定目录（自动获取正文并标记已读）

Examples:
  # 列出最近 10 封邮件（不获取正文，保持未读状态）
  email receive

  # 查看未读邮件
  email receive --unseen --max 20

  # 获取正文并标记已读
  email receive --body

  # 以 Markdown 格式输出正文（自动获取正文）
  email receive --format markdown

  # 获取未读邮件附件（自动获取正文）
  email receive --unseen --attachments ./downloads

  # 按条件筛选
  email receive --from boss@company.com --since 2024-03-01

  # JSON 输出（便于脚本处理）
  email receive --format json --max 50
```

### 2.5 folders - 列出文件夹

```bash
email folders [options]

Options:
  --format <format>          输出格式: table, json（默认: table）

Examples:
  email folders
  email folders --format json
```

### 2.6 list - 列出已配置账户

```bash
email list

# 等同于
email config --list
```

---

## 3. 数据结构

### 3.1 账户配置

```typescript
interface AccountConfig {
  name: string;              // 账户名称
  user: string;              // 邮箱地址
  password: string;          // 明文存储
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

interface AppConfig {
  version: string;
  defaultAccount: string;
  accounts: AccountConfig[];
}
```

### 3.2 邮件数据

```typescript
interface EmailMessage {
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

interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  content?: Buffer;
}
```

### 3.3 配置存储位置

```
~/.config/email-cli/
└── email-cli.json           # 配置文件（明文 JSON，权限 600）
```

---

## 4. 项目结构

```
email-cli/
├── package.json
├── tsconfig.json
├── README.md
├── AGENTS.md                # AI 编码代理指南
├── spec.md                  # 本文档
├── src/
│   ├── index.ts             # CLI 入口
│   ├── commands/
│   │   ├── index.ts         # 命令注册
│   │   ├── config.ts        # config 命令
│   │   ├── send.ts          # send 命令
│   │   └── receive.ts       # receive 命令（含 folders）
│   ├── services/
│   │   ├── imap.ts          # IMAP 服务
│   │   ├── smtp.ts          # SMTP 服务
│   │   └── config.ts        # 配置管理服务
│   ├── utils/
│   │   ├── crypto.ts        # 工具函数（maskPassword）
│   │   └── output.ts        # 输出格式化
│   └── types/
│       └── index.ts         # 类型定义
├── tests/
│   ├── commands/
│   ├── services/
│   └── types/
└── dist/                    # 编译输出
```

---

## 5. 实现要点

### 5.1 收取邮件逻辑

1. **默认只获取信封信息**：`envelope`、`flags`、`bodyStructure`，不获取正文
2. **不标记已读**：默认收取不改变邮件的 `\Seen` 状态
3. **`--body` 选项**：获取邮件正文和附件，并标记为已读；使用 `--format markdown` 时会自动启用
4. **附件下载**：使用 mailparser 解析邮件源码获取附件

### 5.2 错误处理

- 网络错误：明确提示连接失败
- 认证失败：明确提示检查用户名/密码
- 配置不存在：引导用户运行 `email config`
- 所有错误以友好格式输出，`--debug` 时显示堆栈

### 5.3 兼容性

- Node.js >= 18（原生 ESM 支持）
- 支持 Gmail、Outlook、QQ 邮箱、163/126 邮箱、139 邮箱等常见服务商
- 部分邮箱（如 126、163、139）需要设置 `tls: { rejectUnauthorized: false }`

---

## 6. 常见服务商预设

```typescript
const PROVIDER_PRESETS = {
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
```

---

## 7. 发布

```bash
# 构建测试
npm run build
npm test

# 发布到 npm
npm publish --access public
```

### package.json 关键配置

```json
{
  "name": "@lyhue1991/email-cli",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "email": "./dist/index.js"
  },
  "files": ["dist"],
  "engines": {
    "node": ">=18"
  }
}
```
