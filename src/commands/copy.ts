import fs from 'fs';
import path from 'path';
import clipboard from 'clipboardy';
import chalk from 'chalk';
import { logger } from '../utils/logger';

export async function copyCommand() {
  try {
    const loremPath = path.join(process.cwd(), 'lorex.md');

    if (!fs.existsSync(loremPath)) {
      logger.error('lorex.md not found. Run "lorex init" first');
      process.exit(1);
    }

    const content = fs.readFileSync(loremPath, 'utf-8');
    
    try {
      await clipboard.write(content);
      console.log('');
      logger.success('Documentation copied to clipboard!');
      console.log(`${chalk.gray('→')} Ready to paste into any AI chat\n`);
    } catch (clipboardError) {
      // Handle clipboard access error (common in headless environments)
      logger.warn('Clipboard unavailable in this environment');
      console.log(`${chalk.gray('→')} But your documentation is ready to use!\n`);
      process.exit(1);
    }
  } catch (error) {
    logger.error(`Failed to copy: ${error}`);
    process.exit(1);
  }
}
