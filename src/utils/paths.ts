import * as os from 'os';
import * as path from 'path';

/**
 * 规范化账户名称为目录名
 */
function sanitizePathSegment(value: string): string {
  const sanitized = value
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return sanitized || 'default';
}

/**
 * 获取应用数据根目录
 */
function getAppDataRoot(): string {
  const home = os.homedir();

  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support');
  }

  if (process.platform === 'win32') {
    return process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
  }

  return process.env.XDG_DATA_HOME || path.join(home, '.local', 'share');
}

/**
 * 展开用户目录路径
 */
export function resolveUserPath(inputPath: string): string {
  if (inputPath.startsWith('~/')) {
    return path.join(os.homedir(), inputPath.slice(2));
  }

  if (inputPath === '~') {
    return os.homedir();
  }

  return path.resolve(inputPath);
}

/**
 * 获取账户默认保存目录
 */
export function getDefaultSaveDir(accountName: string): string {
  return path.join(getAppDataRoot(), 'email-cli', 'emails', sanitizePathSegment(accountName));
}
