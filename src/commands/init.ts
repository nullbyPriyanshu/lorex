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
import { scanGit, scanGitCommits } from '../scanners/git';
import { scanScripts } from '../scanners/scripts';
import { scanDeployment } from '../scanners/deployment';
import { isSystemDirectory } from '../utils/project';
import { generateMarkdown } from '../generators/markdown';
import { scanNextJsRoutes } from '../scanners/nextjs-routes';
import { scanNextJsStructure } from '../scanners/nextjs-structure';
import { scanAuth } from '../scanners/auth';
import { scanComponents } from '../scanners/components';
import { groupDependencies } from '../utils/dependencies';
import {
  generateNextJsMarkdown,
  writeLorexMarkdown,
} from '../generators/nextjs-markdown';

interface ScanResult {
  packageInfo: any;
  structure: any;
  schema: any;
  envKeys: any;
  routes: string[];
  gitLog: any;
  scripts: any;
  deployment: any;
  isNextJsProject?: boolean;
  nextJsRoutes?: any;
  nextJsStructure?: string;
  auth?: any;
  components?: any;
  commits?: any;
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

    // Check if this is a Next.js project with App Router
    const isNextJsProject =
      packageInfo.stack?.includes('Next.js') &&
      fs.existsSync(path.join(process.cwd(), 'app'));

    let nextJsRoutes, nextJsStructure, auth, components, commits;

    if (isNextJsProject) {
      try {
        nextJsRoutes = await scanNextJsRoutes();
      } catch (error) {
        nextJsRoutes = { pageRoutes: [], apiRoutes: [] };
      }

      try {
        nextJsStructure = scanNextJsStructure();
      } catch (error) {
        nextJsStructure = '(Unable to scan App Router structure)';
      }

      try {
        auth = scanAuth(process.cwd());
      } catch (error) {
        auth = { authType: 'Error detecting auth' };
      }

      try {
        components = await scanComponents(process.cwd());
      } catch (error) {
        components = [];
      }

      try {
        commits = scanGitCommits(5);
      } catch (error) {
        commits = [];
      }
    }

    return {
      packageInfo,
      structure,
      schema,
      envKeys,
      routes,
      gitLog,
      scripts,
      deployment,
      isNextJsProject,
      nextJsRoutes,
      nextJsStructure,
      auth,
      components,
      commits,
    };
  } catch (error) {
    // Return minimal result on error
    return {
      packageInfo: { name: 'Unknown', dependencies: {}, devDependencies: {} },
      structure: '',
      schema: null,
      envKeys: [],
      routes: [],
      gitLog: [],
      scripts: {},
      deployment: {},
      isNextJsProject: false,
    };
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
      spinner.text = `Scanning ${path.basename(projectRoot)}...`;
      const result = await scanProject(projectRoot);
      results.push({ root: projectRoot, result });
    }

    spinner.succeed(chalk.green('Projects scanned successfully'));

    // Generate markdown files
    for (const { root, result } of results) {
      let outputPath = path.join(process.cwd(), 'lorex.md');

      // Determine filename for multi-project setups
      if (results.length > 1) {
        const folderName = path.basename(root);
        outputPath = path.join(process.cwd(), `lorex.${folderName}.md`);
      }

      let markdown: string;

      try {
        // Use Next.js optimized markdown for Next.js projects
        if (result.isNextJsProject && result.nextJsRoutes) {
          const grouped = groupDependencies(
            result.packageInfo.dependencies,
            result.packageInfo.devDependencies
          );

          markdown = generateNextJsMarkdown({
            projectName: result.packageInfo.name || 'Project',
            projectDescription: oneliner,
            nextJsRoutes: result.nextJsRoutes,
            structureTree: result.nextJsStructure || '',
            groupedPackages: grouped,
            authConfig: result.auth || { authType: 'None' },
            commits: result.commits || [],
            components: result.components || [],
            schema: result.schema,
            envKeys: result.envKeys,
          });
        } else {
          // Use original markdown generator for non-Next.js projects
          markdown = generateMarkdown({
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
        }
      } catch (error) {
        markdown = `# ${result.packageInfo.name || 'Project'}

${oneliner}

## Error
Failed to generate documentation: ${error.message}

---
*Generated by [lorex-cli](https://github.com/justpriyanshu/lorex-cli)*`;
      }

      // Write to file
      fs.writeFileSync(outputPath, markdown);
    }

    const duration = (Date.now() - scanStart) / 1000;

    // Calculate total routes (handle both standard and Next.js routes)
    let totalRoutes = 0;
    for (const r of results) {
      if (r.result.isNextJsProject && r.result.nextJsRoutes) {
        totalRoutes +=
          (r.result.nextJsRoutes.pageRoutes?.length || 0) +
          (r.result.nextJsRoutes.apiRoutes?.length || 0);
      } else {
        totalRoutes += r.result.routes.length;
      }
    }

    const totalModels = results.reduce((sum, r) => sum + (r.result.schema?.models.length ?? 0), 0);
    const totalComponents = results.reduce((sum, r) => sum + (r.result.components?.length ?? 0), 0);
    const fileSize = results.length * 1024; // Rough estimate

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
    console.log(`✓ lorex.md generated (${totalRoutes} routes · ${totalComponents} components · ${fileSize}kb)`);
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
