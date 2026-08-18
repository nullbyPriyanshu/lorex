import { intro, outro } from '@clack/prompts';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { logger } from '../utils/logger';
import { detectProjects } from '../utils/monorepo';
import { isSystemDirectory } from '../utils/project';
import { generateMarkdown } from '../generators/markdown';
import { groupDependencies } from '../utils/dependencies';
import { generateNextJsMarkdown } from '../generators/nextjs-markdown';
import { scanProject, getEnvKeysForMarkdown } from '../scan-project';

export async function updateCommand() {
  let spinner: any = null;

  try {
    intro(chalk.cyan('🔄 Updating Lorex Documentation\n'));

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
      // ignore
    }

    if (lorexFiles.length === 0) {
      logger.error('No lorex.md files found. Run "lorex init" first');
      process.exit(1);
    }

    const firstLorexPath = path.join(cwd, lorexFiles[0]);
    const existingContent = fs.readFileSync(firstLorexPath, 'utf-8');
    const onelinerMatch = existingContent.match(/^# .+\n\n(.+)$/m);
    const oneliner = onelinerMatch ? onelinerMatch[1] : 'No description';

    console.log('');

    if (isSystemDirectory()) {
      logger.warn('Are you sure you are in the right project folder?');
    }

    const projectTargets = detectProjects(process.cwd());

    spinner = ora(
      chalk.cyan(
        `Scanning ${projectTargets.length} project${projectTargets.length > 1 ? 's' : ''}...`
      )
    ).start();

    const results: Array<{ outputFile: string; result: Awaited<ReturnType<typeof scanProject>> }> =
      [];
    for (const target of projectTargets) {
      spinner.text = `Scanning ${path.basename(target.root)}...`;
      const result = await scanProject(target.root);
      results.push({ outputFile: target.outputFile, result });
    }

    spinner.succeed(chalk.green('Projects scanned successfully'));

    for (const { outputFile, result } of results) {
      let markdown: string;

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
          authConfig: result.auth || { authType: 'None', providers: [], configFiles: [] },
          commits: result.commits || [],
          components: result.components || [],
          schema: result.schema,
          envKeys: getEnvKeysForMarkdown(result.envKeys),
        });
      } else {
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

      fs.writeFileSync(path.join(process.cwd(), outputFile), markdown);
    }

    console.log('');
    if (results.length === 1) {
      logger.success(
        `Documentation updated at ${chalk.bold(path.join(process.cwd(), results[0].outputFile))}`
      );
    } else {
      logger.success(`Documentation updated for ${results.length} projects:`);
      for (const { outputFile } of results) {
        console.log(`  → ${outputFile}`);
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
