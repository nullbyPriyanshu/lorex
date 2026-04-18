import { intro, outro, text } from '@clack/prompts';
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

export async function initCommand() {
  intro(chalk.cyan('📝  Lorex - Your Project Memory\n'));

  // Ask for project description
  const oneliner = (await text({
    message: 'Describe your project in one line',
  })) as string;

  if (!oneliner || oneliner.length === 0) {
    outro(chalk.red('❌ No description provided'));
    process.exit(1);
  }

  console.log('');

  // Start scanning
  const spinner = ora(chalk.cyan('Scanning your project...')).start();

  try {
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
    const outputPath = path.join(process.cwd(), 'lorex.md');
    fs.writeFileSync(outputPath, markdown);

    console.log('');
    logger.success(`Documentation created at ${chalk.bold(outputPath)}`);
    console.log('');
    outro(chalk.cyan('✨ All done! Run "lorex show" to view your documentation.'));
  } catch (error) {
    spinner.fail(chalk.red('Error scanning project'));
    logger.error(String(error));
    process.exit(1);
  }
}
