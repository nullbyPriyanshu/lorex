import { intro, outro } from '@clack/prompts';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
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

interface ScanResult {
  packageInfo: any;
  structure: any;
  schema: any;
  envKeys: any;
  routes: string[];
  gitLog: any;
  scripts: any;
  deployment: any;
}

async function scanProject(projectRoot: string): Promise<ScanResult> {
  const originalCwd = process.cwd();
  try {
    process.chdir(projectRoot);
    const packageInfo = scanPackage();
    const structure = scanStructure();
    const schema = scanSchema();
    const envKeys = scanEnv();
    const routes = await scanRoutes();
    const gitLog = scanGit();
    const scripts = scanScripts();
    const deployment = scanDeployment();
    return { packageInfo, structure, schema, envKeys, routes, gitLog, scripts, deployment };
  } finally {
    process.chdir(originalCwd);
  }
}

function detectSubProjects(): string[] {
  const cwd = process.cwd();
  const subProjects: string[] = [];

  // Look for common sub-project folders
  const commonFolders = ['client', 'server', 'frontend', 'backend', 'api', 'web', 'mobile'];
  for (const folder of commonFolders) {
    const folderPath = path.join(cwd, folder);
    if (fs.existsSync(path.join(folderPath, 'package.json'))) {
      subProjects.push(folderPath);
    }
  }

  // Also look for any subfolders with package.json
  try {
    const entries = fs.readdirSync(cwd, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const folderPath = path.join(cwd, entry.name);
        const packagePath = path.join(folderPath, 'package.json');
        if (fs.existsSync(packagePath) && !subProjects.includes(folderPath)) {
          // Skip common ignore folders
          if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
            subProjects.push(folderPath);
          }
        }
      }
    }
  } catch {
    // Ignore errors
  }

  return subProjects;
}

export async function updateCommand() {
  let spinner: any = null;

  try {
    intro(chalk.cyan('🔄 Updating Lorex Documentation\n'));

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

    // Read existing file to get oneliner (use the first one)
    const firstLorexPath = path.join(cwd, lorexFiles[0]);
    const existingContent = fs.readFileSync(firstLorexPath, 'utf-8');
    const onelinerMatch = existingContent.match(/^# .+\n\n(.+)$/m);
    const oneliner = onelinerMatch ? onelinerMatch[1] : 'No description';

    console.log('');

    if (isSystemDirectory()) {
      logger.warn('Are you sure you are in the right project folder?');
    }

    // Detect sub-projects
    const subProjects = detectSubProjects();
    const projectsToScan = subProjects.length > 0 ? subProjects : [process.cwd()];

    // Start scanning
    spinner = ora(chalk.cyan(`Scanning ${projectsToScan.length} project${projectsToScan.length > 1 ? 's' : ''}...`)).start();

    const results: Array<{ root: string; result: ScanResult }> = [];
    for (const projectRoot of projectsToScan) {
      const result = await scanProject(projectRoot);
      results.push({ root: projectRoot, result });
    }

    spinner.succeed(chalk.green('Projects scanned successfully'));

    // Generate markdown files
    for (const { root, result } of results) {
      const markdown = generateMarkdown({
        oneliner,
        packageInfo: result.packageInfo,
        structure: result.structure,
        schema: result.schema,
        envKeys: result.envKeys,
        routes: result.routes,
        gitLog: result.gitLog,
        scripts: result.scripts,
        deployment: result.deployment,
      });

      // Determine filename
      let filename = 'lorex.md';
      if (results.length > 1) {
        const folderName = path.basename(root);
        filename = `lorex.${folderName}.md`;
      }

      // Write to file
      const outputPath = path.join(process.cwd(), filename);
      fs.writeFileSync(outputPath, markdown);
    }

    console.log('');
    if (results.length === 1) {
      logger.success(`Documentation updated at ${chalk.bold(path.join(process.cwd(), 'lorex.md'))}`);
    } else {
      logger.success(`Documentation updated for ${results.length} projects:`);
      for (const { root } of results) {
        const folderName = path.basename(root);
        console.log(`  → lorex.${folderName}.md`);
      }
    }
    console.log('');
    outro(chalk.cyan('✨ All done!'));
  } catch (error) {
    if (spinner) {
      spinner.fail(chalk.red('Error updating documentation'));
    }
    logger.error(`Error updating: ${error}`);
    process.exit(1);
  }

  process.exit(0);
}
