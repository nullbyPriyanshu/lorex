import { intro, outro } from '@clack/prompts';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { logger } from '../utils/logger';
import { scanStructure } from '../scanners/structure';
import { scanPackage } from '../scanners/package';
import { scanSchema } from '../scanners/schema';
import { scanRoutes } from '../scanners/routes';
import { scanEnv } from '../scanners/env';
import { scanGit } from '../scanners/git';
import { generateMarkdown } from '../generators/markdown';

export async function updateCommand() {
  intro(chalk.cyan('🔄 Updating Lorex Documentation\n'));

  try {
    const loremPath = path.join(process.cwd(), 'lorex.md');

    if (!fs.existsSync(loremPath)) {
      logger.error('lorex.md not found. Run "lorex init" first');
      process.exit(1);
    }

    // Read existing file to get oneliner
    const existingContent = fs.readFileSync(loremPath, 'utf-8');
    const onelinerMatch = existingContent.match(/^# .+\n\n(.+)$/m);
    const oneliner = onelinerMatch ? onelinerMatch[1] : 'No description';

    console.log('');

    // Start scanning
    const spinner = ora(chalk.cyan('Scanning your project...')).start();

    // Run all scanners
    const packageInfo = scanPackage();
    const structure = scanStructure();
    const schema = scanSchema();
    const envKeys = scanEnv();
    const routes = await scanRoutes();
    const gitLog = scanGit();

    spinner.succeed(chalk.green('Project scanned successfully'));

    // Generate markdown
    const markdown = generateMarkdown({
      oneliner,
      packageInfo,
      structure,
      schema,
      envKeys,
      routes,
      gitLog,
    });

    // Write to file
    fs.writeFileSync(loremPath, markdown);

    console.log('');
    logger.success(`Documentation updated at ${chalk.bold(loremPath)}`);
    console.log('');
    outro(chalk.cyan('✨ All done!'));
  } catch (error) {
    logger.error(`Error updating: ${error}`);
    process.exit(1);
  }

  process.exit(0);
}
