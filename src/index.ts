#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { updateCommand } from './commands/update';
import { copyCommand } from './commands/copy';
import { showCommand } from './commands/show';

const program = new Command();

program
  .name('lorex')
  .description('Your project\'s living memory - Document everything about your project')
  .version('0.0.1');

program
  .command('init')
  .description('Initialize lorex documentation for your project')
  .action(initCommand);

program
  .command('update')
  .description('Update existing lorex documentation')
  .action(updateCommand);

program
  .command('copy')
  .description('Copy lorex documentation to clipboard')
  .action(copyCommand);

program
  .command('show')
  .description('Display lorex documentation in terminal')
  .action(showCommand);

program.parse(process.argv);
