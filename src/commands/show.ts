import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { logger } from '../utils/logger';
import { isSystemDirectory } from '../utils/project';

function extractSection(content: string, heading: string): string[] {
  const lines = content.split('\n');
  const startIndex = lines.findIndex((line) => line.trim() === heading);
  if (startIndex === -1) return [];

  const sectionLines: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) break;
    if (line.trim().length > 0) {
      sectionLines.push(line);
    }
  }

  return sectionLines;
}

function extractTitle(content: string): string {
  const firstLine = content.split('\n')[0] || '';
  return firstLine.replace(/^#\s+/, '').trim();
}

function extractOneliner(content: string): string {
  const lines = content.split('\n');
  const titleIndex = lines.findIndex((line) => line.startsWith('# '));
  if (titleIndex === -1) return '';
  for (let i = titleIndex + 1; i < lines.length; i++) {
    if (lines[i].trim().length > 0) {
      return lines[i].trim();
    }
  }
  return '';
}

function renderShortView(content: string) {
  const title = extractTitle(content);
  const oneliner = extractOneliner(content);
  const stack = extractSection(content, '## Stack');

  console.log(chalk.bold(title));
  console.log(oneliner);
  console.log('');
  if (stack.length > 0) {
    console.log(chalk.cyan('## Stack'));
    for (const line of stack) {
      console.log(line);
    }
  }
}

function renderSummaryView(content: string) {
  const title = extractTitle(content);
  const oneliner = extractOneliner(content);
  const projectType = extractSection(content, '## Project Type');
  const stack = extractSection(content, '## Stack');
  const deployment = extractSection(content, '## Deployment');
  const routes = extractSection(content, '## API Routes').filter((line) => line.trim().startsWith('- ')).length;
  const models = extractSection(content, '## Database Models').filter((line) => line.trim().startsWith('### ')).length;

  console.log(chalk.bold(title));
  console.log(oneliner);
  console.log('');
  if (projectType.length > 0) {
    console.log(chalk.cyan('## Project Type'));
    console.log(projectType[0]);
    console.log('');
  }

  if (stack.length > 0) {
    console.log(chalk.cyan('## Stack'));
    for (const line of stack) {
      console.log(line);
    }
    console.log('');
  }

  console.log(chalk.cyan('## Summary'));
  console.log(`→ Routes: ${routes} found`);
  console.log(`→ Models: ${models} found`);
  if (deployment.length > 0) {
    console.log(`→ Deployment: ${deployment[0].replace(/^-\s*/, '')}`);
  }
}

export function showCommand(options: { short?: boolean }) {
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

    for (const lorexFile of lorexFiles) {
      const lorexPath = path.join(cwd, lorexFile);

      if (!fs.existsSync(lorexPath)) {
        continue;
      }

      const content = fs.readFileSync(lorexPath, 'utf-8');
      const termWidth = process.stdout.columns || 80;

      console.log('');

      if (lorexFiles.length > 1) {
        console.log(chalk.bold(`📄 ${lorexFile}`));
        console.log('');
      }

      if (options?.short) {
        renderShortView(content);
      } else if (termWidth < 80) {
        renderSummaryView(content);
      } else {
        console.log(chalk.dim('─'.repeat(60)));
        console.log('');
        console.log(chalk.cyan(content));
        console.log('');
        console.log(chalk.dim('─'.repeat(60)));
        console.log('');
      }
    }
  } catch (error) {
    logger.error(`Error showing documentation: ${error}`);
    process.exit(1);
  }
}
  } catch (error) {
    logger.error(String(error));
    process.exit(1);
  }

  process.exit(0);
}
