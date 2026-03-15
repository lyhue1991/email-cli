import * as fs from 'fs';
import { CONFIG_FILE, ensureConfigDir } from '../utils/crypto.js';
import type { AppConfig, AccountConfig } from '../types/index.js';

const APP_VERSION = '0.1.0';

/**
 * 标准化配置对象
 */
function normalizeConfig(config: Partial<AppConfig>): AppConfig {
  return {
    version: typeof config.version === 'string' && config.version.length > 0 ? config.version : APP_VERSION,
    defaultAccount: typeof config.defaultAccount === 'string' ? config.defaultAccount : '',
    accounts: Array.isArray(config.accounts) ? config.accounts : [],
    updatedAt: config.updatedAt
  };
}

/**
 * 默认配置
 */
function createDefaultConfig(): AppConfig {
  return {
    version: APP_VERSION,
    defaultAccount: '',
    accounts: []
  };
}

/**
 * 加载配置
 */
export function loadConfig(): AppConfig {
  ensureConfigDir();

  if (!fs.existsSync(CONFIG_FILE)) {
    return createDefaultConfig();
  }

  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf8');
    const config = JSON.parse(content) as Partial<AppConfig>;
    return normalizeConfig(config);
  } catch {
    // 配置文件损坏，返回默认配置
    return createDefaultConfig();
  }
}

/**
 * 保存配置
 */
export function saveConfig(config: AppConfig): void {
  ensureConfigDir();

  config.version = APP_VERSION;
  config.updatedAt = new Date().toISOString();

  const content = JSON.stringify(config, null, 2);

  fs.writeFileSync(CONFIG_FILE, content, { mode: 0o600 });
}

/**
 * 获取账户配置
 */
export function getAccount(name?: string): AccountConfig | null {
  const config = loadConfig();

  if (!name) {
    // 使用默认账户
    if (config.defaultAccount) {
      name = config.defaultAccount;
    } else if (config.accounts.length > 0) {
      // 没有默认账户时，使用第一个
      name = config.accounts[0].name;
    } else {
      return null;
    }
  }

  return config.accounts.find(account => account.name === name) || null;
}

/**
 * 获取所有账户
 */
export function getAllAccounts(): AccountConfig[] {
  const config = loadConfig();
  return config.accounts;
}

/**
 * 添加或更新账户
 */
export function saveAccount(account: AccountConfig): void {
  const config = loadConfig();

  const existingIndex = config.accounts.findIndex(a => a.name === account.name);

  if (existingIndex >= 0) {
    // 更新现有账户
    account.createdAt = config.accounts[existingIndex].createdAt;
    account.updatedAt = new Date().toISOString();
    config.accounts[existingIndex] = account;
  } else {
    // 添加新账户
    account.createdAt = new Date().toISOString();
    account.updatedAt = account.createdAt;
    config.accounts.push(account);

    // 如果是第一个账户，设为默认
    if (config.accounts.length === 1) {
      config.defaultAccount = account.name;
      account.default = true;
    }
  }

  saveConfig(config);
}

/**
 * 删除账户
 */
export function removeAccount(name: string): boolean {
  const config = loadConfig();
  const index = config.accounts.findIndex(a => a.name === name);

  if (index === -1) {
    return false;
  }

  config.accounts.splice(index, 1);

  // 如果删除的是默认账户，清空默认设置
  if (config.defaultAccount === name) {
    config.defaultAccount = config.accounts.length > 0 ? config.accounts[0].name : '';
    if (config.accounts.length > 0) {
      config.accounts[0].default = true;
    }
  }

  saveConfig(config);
  return true;
}

/**
 * 设置默认账户
 */
export function setDefaultAccount(name: string): boolean {
  const config = loadConfig();
  const account = config.accounts.find(a => a.name === name);

  if (!account) {
    return false;
  }

  // 清除所有账户的默认标记
  config.accounts.forEach(a => delete a.default);

  // 设置新的默认账户
  config.defaultAccount = name;
  account.default = true;

  saveConfig(config);
  return true;
}

/**
 * 获取默认账户名
 */
export function getDefaultAccountName(): string | null {
  const config = loadConfig();
  return config.defaultAccount || (config.accounts.length > 0 ? config.accounts[0].name : null);
}
