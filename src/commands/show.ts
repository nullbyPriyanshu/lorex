import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { logger } from '../utils/logger';

export function showCommand() {
  try {
    const loremPath = path.join(process.cwd(), 'lorex.md');

    if (!fs.existsSync(loremPath)) {
      logger.error('lorex.md not found. Run "lorex init" first');
      process.exit(1);
    }

    const content = fs.readFileSync(loremPath, 'utf-8');
    console.log('');
    console.log(chalk.dim('─'.repeat(60)));
    console.log('');
    console.log(chalk.cyan(content));
    console.log('');
    console.log(chalk.dim('─'.repeat(60)));
    console.log('');
    process.exit(0);
  } catch (error) {
    logger.error(`Failed to read file: ${error}`);
    process.exit(1);
  }
}
