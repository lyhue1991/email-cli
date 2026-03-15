# AGENTS.md - email-cli 项目指南

本文档为 AI 编码代理提供项目上下文和开发指南。

## 项目概述

email-cli 是一个 NPX 命令行邮件工具，支持 IMAP 收取和 SMTP 发送邮件。使用 TypeScript 开发，支持多账户配置、附件发送、邮件筛选等功能。

## 技术栈

- **语言**: TypeScript 5.3+
- **运行时**: Node.js >= 18 (ESM)
- **CLI 框架**: Commander.js
- **IMAP 客户端**: imapflow
- **SMTP 客户端**: nodemailer
- **交互式输入**: inquirer
- **输出格式化**: chalk + cli-table3
- **加密**: crypto-js / Node.js crypto 模块

## 构建与开发命令

```bash
# 构建项目
npm run build

# 开发模式（监听文件变化）
npm run dev

# 运行 CLI
npm start
# 或
npm run email

# 清理构建产物
npm run clean

# 测试（目前未配置）
npm test
```

### 运行单个测试

目前项目未配置测试框架。建议使用 Vitest，运行单个测试的命令示例：

```bash
# 安装 vitest 后
npx vitest run tests/commands/config.test.ts
npx vitest run -t "测试名称"
```

## 代码风格指南

### 文件组织

```
src/
├── index.ts           # CLI 入口，创建和运行程序
├── commands/          # CLI 命令实现
│   ├── index.ts       # 命令注册
│   ├── config.ts      # 账户配置命令
│   ├── send.ts        # 发送邮件命令
│   ├── receive.ts     # 收取邮件命令
│   └── list.ts        # 列出账户命令
├── services/          # 业务逻辑服务
│   ├── config.ts      # 配置管理服务
│   ├── imap.ts        # IMAP 服务
│   └── smtp.ts        # SMTP 服务
├── utils/             # 工具函数
│   ├── crypto.ts      # 加密工具
│   └── output.ts      # 输出格式化
└── types/             # 类型定义
    └── index.ts       # 全局类型
```

### 导入规范

```typescript
// 1. Node.js 标准库（使用 * as 或命名导入）
import * as fs from 'fs';
import * as path from 'path';

// 2. 第三方库
import { Command } from 'commander';
import inquirer from 'inquirer';

// 3. 类型导入（使用 type 关键字）
import type { AccountConfig, EmailMessage } from '../types/index.js';

// 4. 本地模块（必须使用 .js 扩展名，即使源文件是 .ts）
import { getAccount, saveAccount } from '../services/config.js';
```

**重要**: TypeScript ESM 项目要求本地导入使用 `.js` 扩展名。

### 命名约定

- **文件名**: kebab-case（如 `config.ts`, `send-email.ts`）
- **函数名**: camelCase（如 `createConfigCommand`, `parseEmails`）
- **类/接口/类型**: PascalCase（如 `AccountConfig`, `EmailMessage`）
- **常量**: UPPER_SNAKE_CASE 或 PascalCase（如 `CONFIG_FILE`, `PROVIDER_PRESETS`）
- **私有函数**: 无下划线前缀，通过模块作用域控制访问

### 函数风格

```typescript
// 使用 JSDoc 注释（中文）
/**
 * 获取账户配置
 * @param name 账户名称
 * @returns 账户配置或 null
 */
export function getAccount(name?: string): AccountConfig | null {
  // 实现
}

// 异步函数明确返回类型
export async function sendEmail(
  account: AccountConfig,
  options: SendOptions
): Promise<{ messageId: string; accepted: string[]; rejected: string[] }> {
  // 实现
}
```

### 类型定义

```typescript
// 接口定义使用中文注释
export interface AccountConfig {
  name: string;              // 账户名称
  user: string;              // 邮箱地址
  password: string;          // 加密存储
  imap: {
    host: string;
    port: number;            // 默认 993
    tls: boolean;            // 默认 true
  };
  // ...
}

// 使用 type 关键字定义联合类型
export type OutputFormat = 'table' | 'json' | 'raw';
```

### 错误处理

```typescript
// CLI 命令中的错误处理模式
try {
  // 业务逻辑
  const result = await someAsyncOperation();
  outputSuccess('Operation succeeded');
} catch (error) {
  outputError(`Operation failed: ${(error as Error).message}`);
  process.exit(1);
}

// 服务层的错误处理
export async function sendEmail(/* ... */): Promise<SendResult> {
  try {
    const info = await transporter.sendMail(mailOptions);
    return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
  } catch (error) {
    throw new Error(`Failed to send email: ${(error as Error).message}`);
  }
}
```

### CLI 命令模式

```typescript
export function createXxxCommand(): Command {
  const cmd = new Command('xxx')
    .description('Command description')
    .option('--option <value>', 'Option description')
    .option('--flag', 'Flag description')
    .action(async (options, cmd) => {
      // 获取全局选项
      const globalOpts = cmd.optsWithGlobals();
      
      // 业务逻辑
      try {
        // ...
      } catch (error) {
        outputError(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  return cmd;
}
```

### 输出函数使用

```typescript
// 使用 utils/output.ts 中的统一输出函数
import { outputSuccess, outputError, outputWarning, outputAccounts } from '../utils/output.js';

outputSuccess('Account saved successfully');
outputError('Account not found');
outputWarning('Password will be stored encrypted');
outputAccounts(accounts, defaultAccount);
```

## TypeScript 配置要点

- `strict: true` - 启用严格模式
- `noUnusedLocals: true` - 禁止未使用的局部变量
- `noUnusedParameters: true` - 禁止未使用的参数
- `noImplicitReturns: true` - 函数所有路径必须返回值
- `module: NodeNext` - 使用 Node.js ESM 模块解析
- `moduleResolution: NodeNext` - Node.js ESM 模块解析策略
- `removeComments: true` - 移除编译后代码中的注释

## 配置存储

- 配置目录: `~/.config/email-cli/`
- 配置文件: `~/.config/email-cli/email-cli.json`（加密存储）
- 密钥文件: `~/.config/email-cli/.key`（权限 600）

## 常见服务商预设

| 服务商 | IMAP | SMTP |
|--------|------|------|
| Gmail | imap.gmail.com:993 | smtp.gmail.com:587 |
| Outlook | outlook.office365.com:993 | smtp.office365.com:587 |
| QQ | imap.qq.com:993 | smtp.qq.com:587 |
| 163 | imap.163.com:993 | smtp.163.com:465 |

## 注意事项

1. **ESM 模块**: 项目使用 ESM，本地导入必须使用 `.js` 扩展名
2. **密码安全**: 密码使用 AES-256-GCM 加密存储，不要在日志中输出
3. **错误消息**: 使用英文错误消息，保持与 CLI 交互一致
4. **中文注释**: 代码注释使用中文，但 CLI 输出使用英文
5. **异步操作**: 所有涉及网络操作的函数都是异步的，使用 async/await