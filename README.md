# email-cli

NPX 命令行邮件工具，支持 IMAP 收取和 SMTP 发送邮件。

这是一个面向邮箱收发场景的 SKILL，基于 NodeJS CLI。
支持配置多邮箱账户、收取 IMAP 邮件、通过 SMTP 发送邮件，并以命令行方式管理邮件流程。

安装此 SKILL：

```bash
npx skills add lyhue1991/email-cli
```

## 特性

- 支持多账户配置和管理
- IMAP 收取邮件（支持筛选未读、发件人、主题、日期）
- SMTP 发送邮件（支持附件、HTML、抄送/密送）
- 列出邮件文件夹
- 支持多种输出格式（表格、JSON、Markdown）
- 收取邮件时可选择是否获取正文（不获取正文时保持未读状态）

## 安装

```bash
# 使用 npx 直接运行
npx @lyhue1991/email-cli --help

# 或全局安装
npm install -g @lyhue1991/email-cli
email --help
```

GitHub 仓库：`lyhue1991/email-cli`

## 快速开始

### 1. 配置账户

```bash
# 交互式配置
email config

# 或命令行配置
email config --name work \
  --user me@company.com \
  --password "app-password" \
  --save-dir "~/Library/Application Support/email-cli/emails/work" \
  --imap-host imap.company.com \
  --smtp-host smtp.company.com
```

配置完成后，账户会带有默认保存目录；收取邮件时如果不传 `--save`，会自动使用该目录。

### 2. 发送邮件

```bash
# 简单发送
email send --to recipient@example.com --subject "Hello" --body "Hi there!"

# 带附件
email send --to recipient@example.com \
  --subject "Report" \
  --body "Please find attached." \
  --attach ./report.pdf

# 管道方式
echo "Email body" | email send --to recipient@example.com --subject "Hello" --stdin
```

### 3. 收取邮件

```bash
# 列出最近 10 封邮件（只显示信封信息，不标记已读）
email receive

# 查看未读邮件
email receive --unseen --max 20

# 获取邮件正文并标记已读
email receive --body

# 以 Markdown 格式输出正文（自动获取正文并标记已读）
email receive --format markdown

# 下载附件（自动获取正文并标记已读）
email receive --attachments ./downloads

# 按条件筛选
email receive --from boss@company.com --since 2024-01-01

# JSON 输出
email receive --format json

# 或使用全局 JSON 开关
email --json receive --max 5
```

### 4. 列出文件夹

```bash
email folders
```

### 5. 管理账户

```bash
# 列出所有账户
email list
email config --list

# 显示账户配置
email config --show work

# 删除账户
email config --remove work

# 设置默认账户
email config --default work
```

## 命令帮助

```bash
email --help
email [command] --help
```

## 常见服务商配置

### Gmail
- IMAP: imap.gmail.com:993 (TLS)
- SMTP: smtp.gmail.com:587 (STARTTLS)
- 需要使用应用专用密码

### Outlook
- IMAP: outlook.office365.com:993 (TLS)
- SMTP: smtp.office365.com:587 (STARTTLS)

### QQ 邮箱
- IMAP: imap.qq.com:993 (TLS)
- SMTP: smtp.qq.com:587 (STARTTLS)
- 需要使用授权码

### 163 邮箱
- IMAP: imap.163.com:993 (TLS)
- SMTP: smtp.163.com:465 (SSL)
- 需要使用授权码

### 126 邮箱
- IMAP: imap.126.com:993 (TLS)
- SMTP: smtp.126.com:465 (SSL)
- 需要使用授权码

### 139 邮箱
- IMAP: imap.139.com:993 (TLS)
- SMTP: smtp.139.com:465 (SSL)

## 配置存储

配置文件位于 `~/.config/email-cli/email-cli.json`，密码当前以明文存储，文件写入权限为 `600`。

每个账户都会保存一个 `saveDir` 字段，默认值按平台生成：

- macOS: `~/Library/Application Support/email-cli/emails/<account>`
- Linux: `${XDG_DATA_HOME:-~/.local/share}/email-cli/emails/<account>`
- Windows: `%LOCALAPPDATA%/email-cli/emails/<account>`

默认优先使用 `defaultAccount`，如果没有设置默认账户，则回退到第一个已配置账户。

## 测试

```bash
npm test
```

## License

MIT
