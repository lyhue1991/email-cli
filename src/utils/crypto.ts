import * as path from 'path';
import * as fs from 'fs';

/**
 * 配置目录
 */
export const CONFIG_DIR = process.env.XDG_CONFIG_HOME
  ? path.join(process.env.XDG_CONFIG_HOME, 'email-cli')
  : path.join(process.env.HOME || process.env.USERPROFILE || '', '.config', 'email-cli');

/**
 * 配置文件路径
 */
export const CONFIG_FILE = path.join(CONFIG_DIR, 'email-cli.json');

/**
 * 确保配置目录存在
 */
export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * 隐藏密码显示
 * @param password 密码
 * @returns 隐藏后的密码 (如：******1234)
 */
export function maskPassword(password: string): string {
  if (password.length <= 4) {
    return '*'.repeat(password.length);
  }
  return '*'.repeat(password.length - 4) + password.slice(-4);
}