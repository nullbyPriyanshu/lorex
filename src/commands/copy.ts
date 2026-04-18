import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { logger } from '../utils/logger';
import { isSystemDirectory, getRelativePath } from '../utils/project';

export async function copyCommand() {
  try {
    if (isSystemDirectory()) {
      logger.warn('Are you sure you are in the right project folder?');
    }

    const lorexPath = path.join(process.cwd(), 'lorex.md');
    const relativeLorex = getRelativePath(lorexPath);

    if (!fs.existsSync(lorexPath)) {
      logger.error(`${relativeLorex} not found. Run "lorex init" first.`);
      process.exit(1);
    }

    const content = fs.readFileSync(lorexPath, 'utf-8');

    if (!content || content.trim().length === 0) {
      logger.error('lorex.md is empty. Run "lorex init" to regenerate.');
      process.exit(1);
    }

    const platform = os.platform();
    const sessionType = process.env.XDG_SESSION_TYPE || '';
    const waylandDisplay = process.env.WAYLAND_DISPLAY || '';
    const isWayland = sessionType === 'wayland' || waylandDisplay !== '';

    const windowsCommands = ['clip'];
    const macCommands = ['pbcopy'];
    const linuxWaylandCommands = ['wl-copy', 'xclip -selection clipboard', 'xsel --clipboard --input'];
    const linuxX11Commands = ['xclip -selection clipboard', 'xsel --clipboard --input', 'wl-copy'];

    let commands: string[] = [];

    if (platform === 'win32') {
      commands = windowsCommands;
    } else if (platform === 'darwin') {
      commands = macCommands;
    } else {
      commands = isWayland ? linuxWaylandCommands : linuxX11Commands;
    }

    let copied = false;

    for (const cmd of commands) {
      try {
        execSync(cmd, {
          input: content,
          stdio: ['pipe', 'ignore', 'ignore'],
          timeout: 3000,
        });
        copied = true;
        break;
      } catch {
        continue;
      }
    }

    if (copied) {
      logger.success('Copied to clipboard! Paste into any AI chat.');
    } else {
      const tmpPath = path.join(os.tmpdir(), 'lorex-output.md');
      fs.writeFileSync(tmpPath, content);
      logger.error('Could not access clipboard automatically.');
      logger.info(`File saved to: ${tmpPath}`);
      logger.info('Linux users: install clipboard tool with one of these:');
      logger.info('  Wayland → sudo dnf install wl-clipboard');
      logger.info('  X11     → sudo dnf install xclip');
      logger.info('  Ubuntu  → sudo apt install xclip');
    }
  } catch (error) {
    logger.error(String(error));
    process.exit(1);
  }

  process.exit(0);
}
