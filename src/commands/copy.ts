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

    // Find all lorex files
    const cwd = process.cwd();
    const lorexFiles: string[] = [];

    try {
      const files = fs.readdirSync(cwd);
      for (const file of files) {
        if (file.startsWith('lorex') && file.endsWith('.md')) {
          lorexFiles.push(file);
        }
      }
    } catch {
      // Ignore
    }

    if (lorexFiles.length === 0) {
      logger.error('No lorex.md files found. Run "lorex init" first');
      process.exit(1);
    }

    // Concatenate all lorex files
    let content = '';
    for (const lorexFile of lorexFiles) {
      const lorexPath = path.join(cwd, lorexFile);

      if (!fs.existsSync(lorexPath)) {
        continue;
      }

      const fileContent = fs.readFileSync(lorexPath, 'utf-8');
      if (content.length > 0) {
        content += '\n\n---\n\n';
      }
      content += fileContent;
    }

    if (!content || content.trim().length === 0) {
      logger.error('lorex.md files are empty. Run "lorex init" to regenerate.');
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
