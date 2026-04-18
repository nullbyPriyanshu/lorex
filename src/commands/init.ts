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
import { scanScripts } from '../scanners/scripts';
import { scanDeployment } from '../scanners/deployment';
import { isSystemDirectory } from '../utils/project';
import { generateMarkdown } from '../generators/markdown';

export async function initCommand() {
  let spinner: any = null;

  try {
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
    spinner = ora(chalk.cyan('Scanning your project...')).start();
    const scanStart = Date.now();

    // Run all scanners
    const packageInfo = scanPackage();
    const structure = scanStructure();
    const schema = scanSchema();
    const envKeys = scanEnv();
    const routes = await scanRoutes();
    const gitLog = scanGit();
    const scripts = scanScripts();
    const deployment = scanDeployment();

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
      scripts,
      deployment,
    });

    // Write to file
    const outputPath = path.join(process.cwd(), 'lorex.md');
    fs.writeFileSync(outputPath, markdown);

    const duration = (Date.now() - scanStart) / 1000;
    const routeCount = routes.length;
    const modelCount = schema?.models.length ?? 0;
    const commitCount = gitLog.length;
    const stackLabel = packageInfo.stack.join(', ');

    console.log('');
    logger.success(`Documentation created at ${chalk.bold(outputPath)}`);
    console.log('');
    console.log('✓ lorex.md generated\n');
    console.log('Detected:');
    console.log(`→ Stack: ${stackLabel}`);
    console.log(`→ Routes: ${routeCount} found`);
    console.log(`→ Models: ${modelCount} found`);
    console.log(`→ Git: ${commitCount} commits`);
    console.log('');
    console.log(`Scanned in ${duration.toFixed(1)}s`);
    console.log('');
    outro(chalk.cyan('Run lorex copy to paste into any AI chat.'));
  } catch (error) {
    if (spinner) {
      spinner.fail(chalk.red('Error scanning project'));
    }
    logger.error(String(error));
    process.exit(1);
  }

  process.exit(0);
}
