---
name: email
description: 邮件命令行工具。使用 email CLI 收发邮件。触发场景：用户要求发送邮件、收取邮件、查看未读邮件、管理邮箱账户、下载邮件附件、配置邮箱。
---

# email

封装 `email` 命令行工具，用于邮件收发管理。

## 核心能力

1. **收取邮件** - 列出邮件、筛选未读、按条件过滤
2. **发送邮件** - 发送文本/HTML 邮件、带附件发送
3. **账户管理** - 配置多个邮箱账户、设置默认账户
4. **文件夹管理** - 列出邮箱文件夹

## 工作流程

### 📬 收取邮件

当用户要求查看邮件、检查新邮件、收取邮件时：

```bash
# 列出最近 10 封邮件（不获取正文，保持未读状态）
email receive --account <账户名>

# 查看未读邮件
email receive --account <账户名> --unseen --max 20

# 获取邮件正文并标记已读
email receive --account <账户名> --body

# 以 Markdown 格式输出正文
email receive --account <账户名> --format markdown

# 下载附件
email receive --account <账户名> --attachments ./downloads

# 按条件筛选
email receive --account <账户名> --from sender@example.com --since 2024-01-01

# JSON 格式输出
email receive --account <账户名> --format json
```

### 📧 发送邮件

当用户要求发送邮件、转发邮件时：

```bash
# 简单发送
email send --account <账户名> --to recipient@example.com --subject "Hello" --body "Hi there!"

# 带附件发送
email send --account <账户名> --to recipient@example.com \
  --subject "Report" \
  --body "Please find attached." \
  --attach ./report.pdf

# HTML 邮件
email send --account <账户名> --to recipient@example.com \
  --subject "Newsletter" \
  --html "<h1>Hello</h1><p>Content here</p>"

# 抄送/密送
email send --account <账户名> \
  --to recipient@example.com \
  --cc boss@company.com \
  --subject "Update" \
  --body "Status update"

# 预览模式（不实际发送）
email send --account <账户名> --to recipient@example.com \
  --subject "Test" --body "Test" --dry-run
```

### ⚙️ 配置邮箱账户

当用户首次使用或需要添加邮箱账户时：

```bash
# 交互式配置
email config

# 命令行配置
email config --name work \
  --user me@company.com \
  --password "app-password" \
  --save-dir "~/Library/Application Support/email-cli/emails/work" \
  --imap-host imap.company.com \
  --imap-port 993 \
  --smtp-host smtp.company.com \
  --smtp-port 587
```

### 🛠️ 错误排查

如果执行失败，按照以下步骤排查：

```
1. 检查安装 → 2. 检查账户配置 → 3. 检查网络连接
```

**Step 1: 检查是否安装 `@lyhue1991/email-cli`**

```bash
command -v email
```

如果未安装，执行：
```bash
npm install -g @lyhue1991/email-cli
```

**Step 2: 检查账户配置**

```bash
email config --list
```

如果没有账户，引导用户配置：
```bash
email config
```

查看账户详情：
```bash
email config --show <账户名>
```

账户配置会显示默认 `saveDir`，收取邮件时如果未传 `--save`，会自动使用该目录。

**Step 3: 检查网络连接**

如果连接超时，可能是网络问题或服务器地址错误。

### 📁 列出文件夹

```bash
email folders --account <账户名>
```

### 👤 账户管理

```bash
# 列出所有账户
email list
email config --list

# 设置默认账户
email config --default <账户名>

# 删除账户
email config --remove <账户名>
```

## 常见服务商配置

| 服务商 | IMAP | SMTP |
|--------|------|------|
| Gmail | imap.gmail.com:993 | smtp.gmail.com:587 |
| Outlook | outlook.office365.com:993 | smtp.office365.com:587 |
| QQ 邮箱 | imap.qq.com:993 | smtp.qq.com:587 |
| 163 | imap.163.com:993 | smtp.163.com:465 |
| 126 | imap.126.com:993 | smtp.126.com:465 |
| 139 | imap.139.com:993 | smtp.139.com:465 |

## 参数说明

### receive 命令

| 参数 | 说明 |
|------|------|
| `--folder <name>` | 文件夹名称，默认 INBOX |
| `--unseen` | 只收取未读邮件 |
| `--seen` | 只收取已读邮件 |
| `--max <count>` | 最大数量，默认 10 |
| `--from <email>` | 按发件人筛选 |
| `--subject <pattern>` | 按主题筛选 |
| `--since <date>` | 按日期筛选 (YYYY-MM-DD) |
| `--body` | 获取邮件正文（会标记已读；`--format markdown` 时自动启用） |
| `--attachments <dir>` | 下载附件到指定目录（自动获取正文并标记已读） |
| `--format <format>` | 输出格式：table, json, markdown |

### send 命令

| 参数 | 说明 |
|------|------|
| `--to <emails>` | 收件人（逗号分隔） |
| `--cc <emails>` | 抄送（逗号分隔） |
| `--bcc <emails>` | 密送（逗号分隔） |
| `--subject <subject>` | 邮件主题 |
| `--body <text>` | 纯文本正文 |
| `--html <html>` | HTML 正文 |
| `--attach <files>` | 附件路径 |
| `--dry-run` | 预览模式 |

## 注意事项

1. **收取邮件不改变状态** - 默认只获取信封信息，不标记已读；使用 `--body` 或 `--format markdown` 才会标记已读
2. **密码安全** - 配置文件存储明文密码，注意保护配置文件
3. **应用专用密码** - Gmail、QQ 等邮箱需要使用应用专用密码/授权码
4. **TLS 证书** - 部分邮箱可能需要忽略证书验证

## 快速参考

```bash
# 查看帮助
email --help
email receive --help
email send --help

# 配置账户
email config
email config --list

# 收取邮件
email receive                          # 列出最近邮件
email receive --unseen --max 20        # 查看未读
email receive --body                   # 获取正文
email receive --format markdown        # Markdown 输出
email receive --attachments ./downloads         # 下载附件

# 发送邮件
email send --to user@example.com --subject "Hello" --body "Hi!"
email send --to user@example.com --subject "Report" --attach ./report.pdf

# 列出文件夹
email folders

# 账户管理
email list
email config --default work
email config --remove old-account
```
