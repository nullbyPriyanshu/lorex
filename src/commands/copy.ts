import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
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
    
    const platforms = [
      { cmd: 'xclip -selection clipboard', input: true },
      { cmd: 'xsel --clipboard --input', input: true },
      { cmd: 'wl-copy', input: true },
      { cmd: 'pbcopy', input: true },
    ];

    let copied = false;
    for (const platform of platforms) {
      try {
        execSync(platform.cmd, { input: content, stdio: ['pipe', 'ignore', 'ignore'] });
        copied = true;
        break;
      } catch {
        continue;
      }
    }

    if (!copied) {
      logger.error('Could not copy. Install xclip: sudo dnf install xclip');
      process.exit(1);
    } else {
      logger.success('Copied to clipboard!');
    }
  } catch (error) {
    logger.error(`Failed to copy: ${error}`);
    process.exit(1);
  }

  process.exit(0);
}
