import { Command } from 'commander';
import { createConfigCommand } from './config.js';
import { createSendCommand } from './send.js';
import { createReceiveCommand, createFoldersCommand } from './receive.js';
import { createListCommand } from './list.js';

/**
 * 注册所有命令
 */
export function registerCommands(program: Command): void {
  program
    .addCommand(createConfigCommand())
    .addCommand(createSendCommand())
    .addCommand(createReceiveCommand())
    .addCommand(createFoldersCommand())
    .addCommand(createListCommand());
}
