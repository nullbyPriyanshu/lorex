import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { scanPackage } from '../scanners/package';
import { scanRoutes } from '../scanners/routes';
import { scanSchema } from '../scanners/schema';
import { scanGit } from '../scanners/git';
import { isSystemDirectory } from '../utils/project';

function parseSection(content: string, heading: string): string[] {
  const lines = content.split('\n');
  const startIndex = lines.findIndex((line) => line.trim() === heading);
  if (startIndex === -1) return [];

  const sectionLines: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) break;
    if (line.trim().length > 0) {
      sectionLines.push(line.trim());
    }
  }

  return sectionLines;
}

function parseStack(content: string): string {
  const lines = parseSection(content, '## Stack');
  return lines.join(' | ');
}

function countListItems(content: string, heading: string, prefix: string): number {
  return parseSection(content, heading).filter((line) => line.startsWith(prefix)).length;
}

export async function diffCommand() {
  try {
    if (isSystemDirectory()) {
      logger.warn('Are you sure you are in the right project folder?');
    }

    const lorexPath = path.join(process.cwd(), 'lorex.md');
    if (!fs.existsSync(lorexPath)) {
      logger.error('No lorex.md found. Run "lorex init" first.');
      process.exit(1);
    }

    const content = fs.readFileSync(lorexPath, 'utf-8');
    const previousRoutes = countListItems(content, '## Routes', '- ');
    const previousModels = countListItems(content, '## Database Models', '### ');
    const previousCommits = countListItems(content, '## Recent Git Activity', '• ');
    const previousStack = parseStack(content);

    const packageInfo = scanPackage();
    const routes = await scanRoutes();
    const schema = scanSchema();
    const gitLog = scanGit();

    const currentRoutes = routes.length;
    const currentModels = schema?.models.length ?? 0;
    const currentCommits = gitLog.length;
    const currentStack = packageInfo.stack.join(', ');

    const changes: string[] = [];

    const routeDelta = currentRoutes - previousRoutes;
    if (routeDelta > 0) {
      changes.push(`+ ${routeDelta} new route${routeDelta === 1 ? '' : 's'} added`);
    } else if (routeDelta < 0) {
      changes.push(`- ${Math.abs(routeDelta)} route${Math.abs(routeDelta) === 1 ? '' : 's'} removed`);
    }

    const modelDelta = currentModels - previousModels;
    if (modelDelta > 0) {
      changes.push(`+ ${modelDelta} new model${modelDelta === 1 ? '' : 's'} added`);
    } else if (modelDelta < 0) {
      changes.push(`- ${Math.abs(modelDelta)} model${Math.abs(modelDelta) === 1 ? '' : 's'} removed`);
    }

    if (currentStack !== previousStack) {
      changes.push('~ stack updated');
    }

    const commitDelta = currentCommits - previousCommits;
    if (commitDelta > 0) {
      changes.push(`+ ${commitDelta} new commit${commitDelta === 1 ? '' : 's'} available`);
    } else if (commitDelta < 0) {
      changes.push(`- ${Math.abs(commitDelta)} old commit${Math.abs(commitDelta) === 1 ? '' : 's'} rotated out`);
    }

    if (changes.length === 0) {
      logger.success('Everything is up to date.');
      process.exit(0);
    }

    console.log('Changes detected:');
    for (const change of changes) {
      console.log(change);
    }

    process.exit(0);
  } catch (error) {
    logger.error(String(error));
    process.exit(1);
  }
}
