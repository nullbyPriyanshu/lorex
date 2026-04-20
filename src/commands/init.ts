import { intro, outro, text } from '@clack/prompts';
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

    // Detect sub-projects
    const subProjects = detectSubProjects();
    const projectsToScan = subProjects.length > 0 ? subProjects : [process.cwd()];

    // Start scanning
    spinner = ora(chalk.cyan(`Scanning ${projectsToScan.length} project${projectsToScan.length > 1 ? 's' : ''}...`)).start();
    const scanStart = Date.now();

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

    const duration = (Date.now() - scanStart) / 1000;
    const totalRoutes = results.reduce((sum, r) => sum + r.result.routes.length, 0);
    const totalModels = results.reduce((sum, r) => sum + (r.result.schema?.models.length ?? 0), 0);
    const totalCommits = results.reduce((sum, r) => sum + r.result.gitLog.length, 0);
    const stacks = results.map(r => r.result.packageInfo.stack.join(', ')).join('; ');

    console.log('');
    if (results.length === 1) {
      logger.success(`Documentation created at ${chalk.bold(path.join(process.cwd(), 'lorex.md'))}`);
    } else {
      logger.success(`Documentation created for ${results.length} projects:`);
      for (const { root } of results) {
        const folderName = path.basename(root);
        console.log(`  → lorex.${folderName}.md`);
      }
    }
    console.log('');
    console.log('✓ Documentation generated\n');
    console.log('Detected:');
    console.log(`→ Stack: ${stacks}`);
    console.log(`→ Routes: ${totalRoutes} found`);
    console.log(`→ Models: ${totalModels} found`);
    console.log(`→ Git: ${totalCommits} commits`);
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
