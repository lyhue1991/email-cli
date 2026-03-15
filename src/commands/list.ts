import { Command } from 'commander';
import { getAllAccounts, getDefaultAccountName } from '../services/config.js';
import { outputAccounts, outputJson } from '../utils/output.js';

/**
 * 列出账户命令
 */
export function createListCommand(): Command {
  const list = new Command('list')
    .description('List configured accounts')
    .action(async (_options, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        const accounts = getAllAccounts();
        const defaultAccount = getDefaultAccountName();

        if (accounts.length === 0) {
          console.log('No accounts configured. Run `email config` to add an account.');
          return;
        }

        if (globalOpts.json) {
          outputJson({ accounts, defaultAccount });
          return;
        }

        outputAccounts(accounts, defaultAccount);

      } catch (error) {
        console.error(`Failed to list accounts: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  return list;
}
