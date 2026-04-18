import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { isSystemDirectory } from '../utils/project';

function formatRelativeTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export async function infoCommand() {
  try {
    if (isSystemDirectory()) {
      logger.warn('Are you sure you are in the right project folder?');
    }

    const root = process.cwd();
    const lorexPath = path.join(root, 'lorex.md');
    const packagePath = path.join(root, 'package.json');

    if (!fs.existsSync(lorexPath)) {
      logger.error('No lorex.md found. Run "lorex init" first.');
      process.exit(1);
    }

    const packageJson = fs.existsSync(packagePath)
      ? JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
      : {};

    const projectName = packageJson.name || path.basename(root);
    const version = packageJson.version || 'unknown';

    const fileContent = fs.readFileSync(lorexPath, 'utf-8');
    const stats = fs.statSync(lorexPath);
    const sizeKb = (stats.size / 1024).toFixed(1);
    const lineCount = fileContent.split('\n').length;
    const lastScanned = formatRelativeTime(Date.now() - stats.mtimeMs);

    console.log(`lorex v${version}`);
    console.log(`Project: ${projectName}`);
    console.log(`Last scanned: ${lastScanned}`);
    console.log(`lorex.md size: ${sizeKb}kb`);
    console.log(`Lines: ${lineCount}`);

    process.exit(0);
  } catch (error) {
    logger.error(String(error));
    process.exit(1);
  }
}
