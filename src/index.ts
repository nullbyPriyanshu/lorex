#!/usr/bin/env node

import { Command } from 'commander';
import packageJson from '../package.json';
import { initCommand } from './commands/init';
import { updateCommand } from './commands/update';
import { copyCommand } from './commands/copy';
import { showCommand } from './commands/show';
import { diffCommand } from './commands/diff';
import { infoCommand } from './commands/info';

const program = new Command();

program
  .name('lorex')
  .description('Your project\'s living memory - Document everything about your project')
  .version(packageJson.version || '0.0.1', '-v, --version', 'Show current lorex-cli version')
  .helpOption('-h, --help', 'Display help for command');

program
  .command('init')
  .description('Create lorex.md for the current project')
  .action(initCommand);

program
  .command('update')
  .description('Refresh existing lorex.md with the latest project state')
  .action(updateCommand);

program
  .command('copy')
  .description('Copy lorex.md contents to the clipboard or save a temp file')
  .action(copyCommand);

program
  .command('show')
  .description('Show lorex.md in the terminal')
  .option('--short', 'Show only project name, one-liner, and stack')
  .action((options) => showCommand(options));

program
  .command('diff')
  .description('Compare current project state with the last lorex.md scan')
  .action(diffCommand);

program
  .command('info')
  .description('Display metadata about the current lorex setup')
  .action(infoCommand);

program.parse(process.argv);
